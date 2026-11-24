package com.lekalu.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Catches incoming SMS while detection is enabled, keeps the ones that look like transactions in
 * an on-device queue, and posts a notification. It never parses amounts or uses the network;
 * the app turns queued SMS into detections the next time it runs.
 */
public class SmsReceiver extends BroadcastReceiver {
    static final String CHANNEL_ID = "sms_detections";
    private static final int NOTIFICATION_ID = 4101;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            return;
        }
        if (SmsStore.getOwner(context) == null) {
            return;
        }

        SmsMessage[] parts = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (parts == null || parts.length == 0) {
            return;
        }

        // A long SMS arrives as several parts; join them per sender, as the SMS inbox stores them
        Map<String, StringBuilder> bodies = new LinkedHashMap<>();
        Map<String, Long> timestamps = new LinkedHashMap<>();
        for (SmsMessage part : parts) {
            if (part == null) {
                continue;
            }
            String sender = part.getDisplayOriginatingAddress();
            if (sender == null) {
                sender = "";
            }
            StringBuilder body = bodies.get(sender);
            if (body == null) {
                body = new StringBuilder();
                bodies.put(sender, body);
                timestamps.put(sender, part.getTimestampMillis());
            }
            String text = part.getDisplayMessageBody();
            if (text != null) {
                body.append(text);
            }
        }

        String lastSender = null;
        int queued = 0;
        for (Map.Entry<String, StringBuilder> entry : bodies.entrySet()) {
            String body = entry.getValue().toString();
            if (!SmsStore.looksTransactional(entry.getKey(), body)) {
                continue;
            }
            Long timestamp = timestamps.get(entry.getKey());
            queued = SmsStore.enqueue(context, entry.getKey(), body, timestamp == null ? System.currentTimeMillis() : timestamp);
            lastSender = entry.getKey();
        }

        if (lastSender != null) {
            notifyQueued(context, lastSender, queued);
        }
    }

    private static void notifyQueued(Context context, String sender, int queued) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        ensureChannel(context);

        Intent open = new Intent(context, MainActivity.class)
                .putExtra(SmsSupport.EXTRA_ROUTE, "/inbox")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String text = queued > 1
                ? context.getString(R.string.sms_notification_text_many, queued)
                : context.getString(R.string.sms_notification_text, sender);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentTitle(context.getString(R.string.sms_notification_title))
                .setContentText(text)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build());
        } catch (SecurityException ignored) {
            // Notification permission revoked between the check and the call
        }
    }

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) {
            return;
        }
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, context.getString(R.string.sms_channel_name), NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription(context.getString(R.string.sms_channel_description));
        manager.createNotificationChannel(channel);
    }

    static void cancelNotification(Context context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID);
    }
}
