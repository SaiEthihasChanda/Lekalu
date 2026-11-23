package com.lekalu.app;

import android.content.Intent;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Play Store build: no SMS access. No JavaScript interface is added, so the web app hides
 * SMS detection entirely.
 */
final class SmsSupport {
    SmsSupport(@NonNull AppCompatActivity activity, @NonNull WebView webView, @NonNull String trustedHost) {
    }

    @NonNull
    String initialRoute(@Nullable Intent intent) {
        return "/";
    }

    void onNewIntent(@Nullable Intent intent) {
    }

    void onPageStarted(@Nullable String url) {
    }

    void onResume() {
    }

    void onDestroy() {
    }
}
