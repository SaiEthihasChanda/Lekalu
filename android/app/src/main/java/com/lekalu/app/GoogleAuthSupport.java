package com.lekalu.app;

import android.net.Uri;
import android.os.CancellationSignal;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.ClearCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.NoCredentialException;

import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Native "Sign in with Google" for the WebView app (both flavors).
 *
 * Google does not allow OAuth inside an embedded WebView, so the web app's popup sign-in cannot
 * work here. Instead the web app calls {@code LekaluAuth.signIn(requestId)}; Credential Manager
 * shows the system account picker and the resulting Google ID token is handed back to the page
 * through a {@code lekalu-auth} event, where Firebase Auth signs in with it.
 *
 * Requires an Android OAuth client (package name + signing SHA-1) in the Firebase project.
 */
final class GoogleAuthSupport {
    private static final String JS_INTERFACE = "LekaluAuth";

    private final AppCompatActivity activity;
    private final WebView webView;
    private final String trustedHost;
    private final CredentialManager credentialManager;
    private volatile boolean trustedPage;

    GoogleAuthSupport(@NonNull AppCompatActivity activity, @NonNull WebView webView, @NonNull String trustedHost) {
        this.activity = activity;
        this.webView = webView;
        this.trustedHost = trustedHost;
        this.credentialManager = CredentialManager.create(activity);
        webView.addJavascriptInterface(new Bridge(), JS_INTERFACE);
    }

    void onPageStarted(@Nullable String url) {
        Uri uri = url == null ? null : Uri.parse(url);
        trustedPage = uri != null && "https".equalsIgnoreCase(uri.getScheme()) && trustedHost.equalsIgnoreCase(uri.getHost());
    }

    private void startSignIn(@NonNull String requestId) {
        GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(
                activity.getString(R.string.google_web_client_id)).build();
        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(option)
                .build();

        credentialManager.getCredentialAsync(
                activity,
                request,
                new CancellationSignal(),
                ContextCompat.getMainExecutor(activity),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        Credential credential = response.getCredential();
                        if (credential instanceof CustomCredential
                                && GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
                            try {
                                String idToken = GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                                dispatch(requestId, idToken, null, null);
                            } catch (RuntimeException exception) {
                                dispatch(requestId, null, "failed", "Could not read the Google sign-in result.");
                            }
                            return;
                        }
                        dispatch(requestId, null, "failed", "Unexpected sign-in result.");
                    }

                    @Override
                    public void onError(@NonNull GetCredentialException exception) {
                        if (exception instanceof GetCredentialCancellationException) {
                            dispatch(requestId, null, "cancelled", "Sign-in cancelled.");
                        } else if (exception instanceof NoCredentialException) {
                            dispatch(requestId, null, "no-account", "No Google account is available on this device.");
                        } else {
                            String message = exception.getMessage();
                            dispatch(requestId, null, "failed",
                                    "Google sign-in failed" + (message == null || message.isEmpty() ? "." : ": " + message));
                        }
                    }
                });
    }

    private void clearState() {
        credentialManager.clearCredentialStateAsync(
                new ClearCredentialStateRequest(),
                new CancellationSignal(),
                ContextCompat.getMainExecutor(activity),
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override
                    public void onResult(Void result) {
                    }

                    @Override
                    public void onError(@NonNull ClearCredentialException exception) {
                    }
                });
    }

    private void dispatch(@NonNull String requestId, @Nullable String idToken, @Nullable String error, @Nullable String message) {
        if (!trustedPage) {
            return;
        }
        try {
            JSONObject detail = new JSONObject().put("requestId", requestId);
            if (idToken != null) {
                detail.put("idToken", idToken);
            } else {
                detail.put("error", error).put("message", message);
            }
            webView.post(() -> webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('lekalu-auth',{detail:" + detail + "}))", null));
        } catch (JSONException ignored) {
            // Cannot happen with string values
        }
    }

    private final class Bridge {
        @JavascriptInterface
        public boolean isAvailable() {
            return trustedPage;
        }

        @JavascriptInterface
        public void signIn(String requestId) {
            if (!trustedPage || requestId == null) {
                return;
            }
            activity.runOnUiThread(() -> startSignIn(requestId));
        }

        @JavascriptInterface
        public void signOut() {
            if (!trustedPage) {
                return;
            }
            activity.runOnUiThread(GoogleAuthSupport.this::clearState);
        }
    }
}
