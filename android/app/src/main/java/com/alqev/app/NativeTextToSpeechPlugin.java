package com.alqev.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "NativeTextToSpeech")
public class NativeTextToSpeechPlugin extends Plugin {

    private TextToSpeech textToSpeech;
    private boolean initialized = false;

    @Override
    public void load() {
        super.load();

        textToSpeech = new TextToSpeech(
                getContext(),
                status -> {
                    initialized =
                            status == TextToSpeech.SUCCESS;
                }
        );

        textToSpeech.setOnUtteranceProgressListener(
                new UtteranceProgressListener() {

                    @Override
                    public void onStart(String utteranceId) {
                        JSObject event = new JSObject();
                        event.put("speaking", true);
                        notifyListeners(
                                "speechState",
                                event
                        );
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        JSObject event = new JSObject();
                        event.put("speaking", false);
                        notifyListeners(
                                "speechState",
                                event
                        );
                    }

                    @Override
                    public void onError(String utteranceId) {
                        JSObject event = new JSObject();
                        event.put("speaking", false);
                        notifyListeners(
                                "speechState",
                                event
                        );
                    }
                }
        );
    }

    @PluginMethod
    public void speak(PluginCall call) {

        String text =
                call.getString("text");

        String languageTag =
                call.getString("language");

        if (
                text == null ||
                text.trim().isEmpty()
        ) {
            call.reject("TEXT_REQUIRED");
            return;
        }

        if (
                textToSpeech == null ||
                !initialized
        ) {
            call.reject("TTS_NOT_READY");
            return;
        }

        Locale locale =
                languageTag != null &&
                !languageTag.trim().isEmpty()
                        ? Locale.forLanguageTag(
                                languageTag.trim()
                        )
                        : Locale.getDefault();

        int languageResult =
                textToSpeech.setLanguage(
                        locale
                );

        if (
                languageResult ==
                        TextToSpeech.LANG_MISSING_DATA ||
                languageResult ==
                        TextToSpeech.LANG_NOT_SUPPORTED
        ) {
            call.reject(
                    "LANGUAGE_NOT_SUPPORTED"
            );
            return;
        }

        textToSpeech.setSpeechRate(0.95f);
        textToSpeech.setPitch(1.0f);

        String utteranceId =
                UUID.randomUUID().toString();

        Bundle params =
                new Bundle();

        int result =
                textToSpeech.speak(
                        text,
                        TextToSpeech.QUEUE_FLUSH,
                        params,
                        utteranceId
                );

        if (
                result ==
                        TextToSpeech.ERROR
        ) {
            call.reject("TTS_SPEAK_FAILED");
            return;
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {

        if (textToSpeech != null) {
            textToSpeech.stop();
        }

        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {

        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }

        initialized = false;

        super.handleOnDestroy();
    }
}