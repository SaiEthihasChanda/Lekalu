package com.lekalu.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {
    private static final String APP_ASSET_HOST = "appassets.androidplatform.net";
    private static final String WEB_ASSET_PREFIX = "public/";

    private WebView webView;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.web_view);
        configureWebView();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }

                setEnabled(false);
                MainActivity.super.onBackPressed();
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl("https://" + APP_ASSET_HOST + "/");
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportMultipleWindows(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleNavigation(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleNavigation(Uri.parse(url));
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loadAppAsset(request.getUrl());
            }
        });

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    }

    private boolean handleNavigation(@NonNull Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();

        if ("https".equalsIgnoreCase(scheme) && APP_ASSET_HOST.equalsIgnoreCase(host)) {
            return false;
        }

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException exception) {
            return false;
        }

        return true;
    }

    @Nullable
    private WebResourceResponse loadAppAsset(@NonNull Uri uri) {
        if (!"https".equalsIgnoreCase(uri.getScheme()) || !APP_ASSET_HOST.equalsIgnoreCase(uri.getHost())) {
            return null;
        }

        String path = uri.getPath();
        String normalizedPath = path == null ? "" : path.startsWith("/") ? path.substring(1) : path;

        if (normalizedPath.isEmpty() || !normalizedPath.contains(".")) {
            return openAsset(WEB_ASSET_PREFIX + "index.html", "text/html");
        }

        WebResourceResponse exactAsset = openAsset(WEB_ASSET_PREFIX + normalizedPath, getMimeType(normalizedPath));
        if (exactAsset != null) {
            return exactAsset;
        }

        if (normalizedPath.startsWith("assets/")) {
            return openAsset(WEB_ASSET_PREFIX + "index.html", "text/html");
        }

        return null;
    }

    @Nullable
    private WebResourceResponse openAsset(@NonNull String assetPath, @NonNull String mimeType) {
        try {
            InputStream inputStream = getAssets().open(assetPath);
            String encoding = mimeType.startsWith("text/") || mimeType.contains("json") || mimeType.contains("javascript") ? "utf-8" : null;
            return new WebResourceResponse(mimeType, encoding, inputStream);
        } catch (IOException exception) {
            return null;
        }
    }

    @NonNull
    private String getMimeType(@NonNull String assetPath) {
        String lowerPath = assetPath.toLowerCase(Locale.US);

        if (lowerPath.endsWith(".html") || lowerPath.endsWith(".htm")) {
            return "text/html";
        }

        if (lowerPath.endsWith(".js") || lowerPath.endsWith(".mjs")) {
            return "application/javascript";
        }

        if (lowerPath.endsWith(".css")) {
            return "text/css";
        }

        if (lowerPath.endsWith(".json")) {
            return "application/manifest+json";
        }

        if (lowerPath.endsWith(".svg")) {
            return "image/svg+xml";
        }

        if (lowerPath.endsWith(".png")) {
            return "image/png";
        }

        if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
            return "image/jpeg";
        }

        if (lowerPath.endsWith(".webp")) {
            return "image/webp";
        }

        if (lowerPath.endsWith(".ico")) {
            return "image/x-icon";
        }

        if (lowerPath.endsWith(".woff2")) {
            return "font/woff2";
        }

        if (lowerPath.endsWith(".woff")) {
            return "font/woff";
        }

        if (lowerPath.endsWith(".ttf")) {
            return "font/ttf";
        }

        return "application/octet-stream";
    }
}
