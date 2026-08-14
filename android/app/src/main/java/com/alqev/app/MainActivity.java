package com.alqev.app;

import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeDocumentCameraPlugin.class);
        registerPlugin(NativeSpeechRecognizerPlugin.class);
        registerPlugin(NativeTextToSpeechPlugin.class);
        super.onCreate(savedInstanceState);

        View rootView = findViewById(android.R.id.content);

        ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout()
            );

            view.setPadding(
                insets.left,
                insets.top,
                insets.right,
                insets.bottom
            );

            return WindowInsetsCompat.CONSUMED;
        });

        ViewCompat.requestApplyInsets(rootView);
    }
}