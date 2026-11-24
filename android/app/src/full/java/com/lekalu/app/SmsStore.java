package com.lekalu.app;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.Nullable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * On-device state for SMS detection. SMS text stays in app-private storage only until the app
 * has turned it into a detection; nothing here touches the network.
 *
 * - owner: the signed-in user who enabled detection on this phone; the queue is only handed to them
 * - scanFrom: earliest SMS time to read (the user's choice when enabling)
 * - cursor: when the app last finished reading SMS
 * - queue: SMS caught by {@link SmsReceiver} while the app was not running
 */
final class SmsStore {
    private static final String PREFS = "lekalu_sms";
    private static final String KEY_OWNER = "owner";
    private static final String KEY_SCAN_FROM = "scanFrom";
    private static final String KEY_CURSOR = "cursor";
    private static final String KEY_QUEUE = "queue";
    private static final int MAX_QUEUE = 1000;

    private static final Pattern MONEY = Pattern.compile(
            "(?i)(\\brs\\.?|\\binr|₹|debit|credit|spent|paid|withdrawn|received|sent|deposited|refund|revers)");
    private static final Pattern HAS_DIGIT = Pattern.compile("[0-9]");
    /** Service (-S) and transactional (-T) headers only; mirrors isAlertSender in src/sms/parser.js. */
    private static final Pattern ALERT_SENDER = Pattern.compile("^(?:.*-)?[A-Z0-9]{3,}-[ST]$");

    interface Listener {
        void onQueued();
    }

    @Nullable
    private static volatile Listener listener;

    private SmsStore() {
    }

    static void setListener(@Nullable Listener value) {
        listener = value;
    }

    /**
     * Cheap filter so chats, promotions and OTP-only texts are not stored; the app does the real parsing.
     * Only -S/-T sender headers pass; -P, -G, unsuffixed headers and phone numbers are dropped.
     */
    static boolean looksTransactional(@Nullable String sender, @Nullable String body) {
        return sender != null && ALERT_SENDER.matcher(sender.trim().toUpperCase(java.util.Locale.ROOT)).matches()
                && body != null && HAS_DIGIT.matcher(body).find() && MONEY.matcher(body).find();
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @Nullable
    static synchronized String getOwner(Context context) {
        return prefs(context).getString(KEY_OWNER, null);
    }

    static synchronized long getScanFrom(Context context) {
        return prefs(context).getLong(KEY_SCAN_FROM, 0L);
    }

    static synchronized long getCursor(Context context) {
        return prefs(context).getLong(KEY_CURSOR, 0L);
    }

    static synchronized void enable(Context context, String uid, long scanFrom) {
        prefs(context).edit()
                .putString(KEY_OWNER, uid)
                .putLong(KEY_SCAN_FROM, scanFrom)
                .putLong(KEY_CURSOR, 0L)
                .putString(KEY_QUEUE, "[]")
                .apply();
    }

    static synchronized void disable(Context context) {
        prefs(context).edit().clear().apply();
    }

    static synchronized void setCursor(Context context, long cursor) {
        prefs(context).edit().putLong(KEY_CURSOR, cursor).apply();
    }

    private static JSONArray readQueue(Context context) {
        try {
            return new JSONArray(prefs(context).getString(KEY_QUEUE, "[]"));
        } catch (JSONException exception) {
            return new JSONArray();
        }
    }

    static synchronized int enqueue(Context context, String sender, String body, long timestamp) {
        JSONArray queue = readQueue(context);
        try {
            JSONObject item = new JSONObject();
            item.put("id", UUID.randomUUID().toString());
            item.put("sender", sender);
            item.put("body", body);
            item.put("timestamp", timestamp);
            queue.put(item);
        } catch (JSONException exception) {
            return queue.length();
        }
        // The SMS inbox scan covers anything older, so trimming the oldest entries loses nothing
        while (queue.length() > MAX_QUEUE) {
            queue.remove(0);
        }
        prefs(context).edit().putString(KEY_QUEUE, queue.toString()).apply();

        Listener current = listener;
        if (current != null) {
            current.onQueued();
        }
        return queue.length();
    }

    /** Queued SMS, only for the user who enabled detection; nothing is removed until acked. */
    static synchronized String drain(Context context, String uid) {
        String owner = getOwner(context);
        if (owner == null || !owner.equals(uid)) {
            return "[]";
        }
        return readQueue(context).toString();
    }

    static synchronized void ack(Context context, String idsJson) {
        Set<String> ids = new HashSet<>();
        try {
            JSONArray array = new JSONArray(idsJson);
            for (int i = 0; i < array.length(); i++) {
                ids.add(array.getString(i));
            }
        } catch (JSONException exception) {
            return;
        }
        JSONArray queue = readQueue(context);
        JSONArray remaining = new JSONArray();
        for (int i = 0; i < queue.length(); i++) {
            JSONObject item = queue.optJSONObject(i);
            if (item != null && !ids.contains(item.optString("id"))) {
                remaining.put(item);
            }
        }
        prefs(context).edit().putString(KEY_QUEUE, remaining.toString()).apply();
    }

    static synchronized int queueSize(Context context) {
        return readQueue(context).length();
    }
}
