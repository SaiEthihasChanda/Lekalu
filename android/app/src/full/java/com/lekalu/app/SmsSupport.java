package com.lekalu.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.provider.Telephony;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Sideload build: exposes the {@code LekaluSms} JavaScript interface to the bundled web app.
 * The interface only answers while the WebView shows the app's own bundled pages.
 */
final class SmsSupport {
    static final String EXTRA_ROUTE = "lekalu_route";
    private static final String JS_INTERFACE = "LekaluSms";
    private static final int MAX_SCAN_ROWS = 5000;

    private final AppCompatActivity activity;
    private final WebView webView;
    private final String trustedHost;
    private final ActivityResultLauncher<String[]> smsPermissionLauncher;
    private final ActivityResultLauncher<String> notificationPermissionLauncher;
    private volatile boolean trustedPage;

    SmsSupport(@NonNull AppCompatActivity activity, @NonNull WebView webView, @NonNull String trustedHost) {
        this.activity = activity;
        this.webView = webView;
        this.trustedHost = trustedHost;

        smsPermissionLauncher = activity.registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                result -> dispatch("sms-permission", hasSmsPermission()));
        notificationPermissionLauncher = activity.registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> dispatch("notification-permission", granted));

        webView.addJavascriptInterface(new Bridge(), JS_INTERFACE);
        SmsStore.setListener(() -> dispatch("sms-queued", true));
    }

    /** Route to open first, e.g. "/inbox" when launched from a detection notification. */
    @NonNull
    String initialRoute(@Nullable Intent intent) {
        String route = intent == null ? null : intent.getStringExtra(EXTRA_ROUTE);
        return route != null && route.startsWith("/") ? route : "/";
    }

    void onNewIntent(@Nullable Intent intent) {
        String route = intent == null ? null : intent.getStringExtra(EXTRA_ROUTE);
        if (route == null || !route.startsWith("/")) {
            return;
        }
        webView.post(() -> webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('lekalu-navigate',{detail:" + JSONObject.quote(route) + "}))", null));
    }

    void onPageStarted(@Nullable String url) {
        Uri uri = url == null ? null : Uri.parse(url);
        trustedPage = uri != null && "https".equalsIgnoreCase(uri.getScheme()) && trustedHost.equalsIgnoreCase(uri.getHost());
    }

    void onResume() {
        SmsReceiver.cancelNotification(activity);
    }

    void onDestroy() {
        SmsStore.setListener(null);
    }

    private boolean hasSmsPermission() {
        return ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(activity, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasNotificationPermission() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private void dispatch(String type, boolean granted) {
        try {
            JSONObject detail = new JSONObject().put("type", type).put("granted", granted);
            webView.post(() -> webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('lekalu-sms',{detail:" + detail + "}))", null));
        } catch (JSONException ignored) {
            // Cannot happen with constant keys
        }
    }

    private final class Bridge {
        @JavascriptInterface
        public String getStatus() {
            if (!trustedPage) {
                return "{}";
            }
            try {
                return new JSONObject()
                        .put("smsPermission", hasSmsPermission())
                        .put("notificationPermission", hasNotificationPermission())
                        .put("ownerUid", SmsStore.getOwner(activity) == null ? JSONObject.NULL : SmsStore.getOwner(activity))
                        .put("scanFrom", SmsStore.getScanFrom(activity))
                        .put("cursor", SmsStore.getCursor(activity))
                        .put("queued", SmsStore.queueSize(activity))
                        .put("sdkInt", Build.VERSION.SDK_INT)
                        .toString();
            } catch (JSONException exception) {
                return "{}";
            }
        }

        @JavascriptInterface
        public void requestSmsPermission() {
            if (!trustedPage) {
                return;
            }
            if (hasSmsPermission()) {
                dispatch("sms-permission", true);
                return;
            }
            activity.runOnUiThread(() -> smsPermissionLauncher.launch(
                    new String[]{Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS}));
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (!trustedPage) {
                return;
            }
            if (hasNotificationPermission()) {
                dispatch("notification-permission", true);
                return;
            }
            activity.runOnUiThread(() -> notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS));
        }

        @JavascriptInterface
        public void enable(String uid, double scanFrom) {
            if (!trustedPage || uid == null || uid.isEmpty()) {
                return;
            }
            SmsStore.enable(activity, uid, (long) scanFrom);
            SmsReceiver.ensureChannel(activity);
        }

        @JavascriptInterface
        public void disable() {
            if (trustedPage) {
                SmsStore.disable(activity);
            }
        }

        @JavascriptInterface
        public void setCursor(double cursor) {
            if (trustedPage) {
                SmsStore.setCursor(activity, (long) cursor);
            }
        }

        @JavascriptInterface
        public String drainQueue(String uid) {
            return trustedPage ? SmsStore.drain(activity, uid) : "[]";
        }

        @JavascriptInterface
        public void ackQueue(String idsJson) {
            if (trustedPage) {
                SmsStore.ack(activity, idsJson);
            }
        }

        /**
         * SMS inbox messages received from {@code from} (and up to {@code to} if > 0) that look like
         * money movements. Only while detection is enabled and permission is granted.
         */
        @JavascriptInterface
        public String scan(double from, double to) {
            if (!trustedPage || SmsStore.getOwner(activity) == null || !hasSmsPermission()) {
                return "[]";
            }
            List<String> args = new ArrayList<>();
            StringBuilder selection = new StringBuilder(Telephony.Sms.DATE + " >= ?");
            args.add(String.valueOf((long) from));
            if (to > 0) {
                selection.append(" AND ").append(Telephony.Sms.DATE).append(" <= ?");
                args.add(String.valueOf((long) to));
            }

            JSONArray result = new JSONArray();
            String[] projection = {Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.DATE_SENT};
            try (Cursor cursor = activity.getContentResolver().query(
                    Telephony.Sms.Inbox.CONTENT_URI, projection, selection.toString(),
                    args.toArray(new String[0]), Telephony.Sms.DATE + " ASC")) {
                if (cursor == null) {
                    return "[]";
                }
                while (cursor.moveToNext() && result.length() < MAX_SCAN_ROWS) {
                    String body = cursor.getString(1);
                    if (!SmsStore.looksTransactional(cursor.getString(0), body)) {
                        continue;
                    }
                    long received = cursor.getLong(2);
                    long sent = cursor.getLong(3);
                    // Same timestamp the receiver sees (service-centre time) when the inbox has it
                    result.put(new JSONObject()
                            .put("sender", cursor.getString(0) == null ? "" : cursor.getString(0))
                            .put("body", body)
                            .put("timestamp", sent > 0 ? sent : received));
                }
            } catch (SecurityException | JSONException exception) {
                return "[]";
            }
            return result.toString();
        }

        @JavascriptInterface
        public void openAppSettings() {
            if (!trustedPage) {
                return;
            }
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", activity.getPackageName(), null));
            activity.runOnUiThread(() -> activity.startActivity(intent));
        }
    }
}
