package com.alqev.app;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(
        name = "NativeSpeechRecognizer",
        permissions = {
                @Permission(
                        alias = "microphone",
                        strings = {Manifest.permission.RECORD_AUDIO}
                )
        }
)
public class NativeSpeechRecognizerPlugin extends Plugin {

    private SpeechRecognizer speechRecognizer;
    private PluginCall activeCall;

    @PluginMethod
    public void startListening(PluginCall call) {

        if (getPermissionState("microphone")
                != PermissionState.GRANTED) {

            requestPermissionForAlias(
                    "microphone",
                    call,
                    "microphonePermissionResult"
            );

            return;
        }

        beginRecognition(
                call,
                call.getString("language")
        );
    }

    @PermissionCallback
    private void microphonePermissionResult(PluginCall call) {

        if (getPermissionState("microphone")
                == PermissionState.GRANTED) {

            beginRecognition(
                    call,
                    call.getString("language")
            );

        } else {

            call.reject("MICROPHONE_PERMISSION_DENIED");
        }
    }

    private void beginRecognition(
            PluginCall call,
            String requestedLanguage
    ) {

        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("SPEECH_RECOGNITION_NOT_AVAILABLE");
            return;
        }

        getActivity().runOnUiThread(() -> {

            destroyRecognizer();

            activeCall = call;

            speechRecognizer =
                    SpeechRecognizer.createSpeechRecognizer(
                            getContext()
                    );

            speechRecognizer.setRecognitionListener(
                    new RecognitionListener() {

                        @Override
                        public void onReadyForSpeech(Bundle params) {
                            JSObject event = new JSObject();
                            event.put("listening", true);

                            notifyListeners(
                                    "speechState",
                                    event
                            );
                        }

                        @Override
                        public void onBeginningOfSpeech() {
                        }

                        @Override
                        public void onRmsChanged(float rmsdB) {
                        }

                        @Override
                        public void onBufferReceived(byte[] buffer) {
                        }

                        @Override
                        public void onEndOfSpeech() {
                            JSObject event = new JSObject();
                            event.put("listening", false);

                            notifyListeners(
                                    "speechState",
                                    event
                            );
                        }

                        @Override
                        public void onError(int error) {

                            PluginCall currentCall = activeCall;

                            activeCall = null;

                            destroyRecognizer();

                            if (currentCall != null) {
                                currentCall.reject(
                                        getErrorCode(error)
                                );
                            }
                        }

                        @Override
                        public void onResults(Bundle results) {

                            ArrayList<String> matches =
                                    results.getStringArrayList(
                                            SpeechRecognizer.RESULTS_RECOGNITION
                                    );

                            String text = "";

                            if (matches != null && !matches.isEmpty()) {
                                text = matches.get(0);
                            }

                            JSObject response = new JSObject();
                            response.put("text", text);

                            PluginCall currentCall = activeCall;

                            activeCall = null;

                            destroyRecognizer();

                            if (currentCall != null) {
                                currentCall.resolve(response);
                            }
                        }

                        @Override
                        public void onPartialResults(
                                Bundle partialResults
                        ) {
                        }

                        @Override
                        public void onEvent(
                                int eventType,
                                Bundle params
                        ) {
                        }
                    }
            );

            Intent intent =
                    new Intent(
                            RecognizerIntent.ACTION_RECOGNIZE_SPEECH
                    );

            intent.putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            );

            intent.putExtra(
                    RecognizerIntent.EXTRA_PARTIAL_RESULTS,
                    false
            );

            String language =
                    requestedLanguage != null
                            && !requestedLanguage.trim().isEmpty()
                            ? requestedLanguage.trim()
                            : Locale.getDefault().toLanguageTag();

            intent.putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE,
                    language
            );

            speechRecognizer.startListening(intent);
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {

        getActivity().runOnUiThread(() -> {

            if (speechRecognizer != null) {
                speechRecognizer.stopListening();
            }

            call.resolve();
        });
    }

    private void destroyRecognizer() {

        if (speechRecognizer != null) {

            try {
                speechRecognizer.destroy();
            } catch (Exception ignored) {
            }

            speechRecognizer = null;
        }
    }

    private String getErrorCode(int error) {

        switch (error) {

            case SpeechRecognizer.ERROR_AUDIO:
                return "SPEECH_AUDIO_ERROR";

            case SpeechRecognizer.ERROR_CLIENT:
                return "SPEECH_CLIENT_ERROR";

            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "MICROPHONE_PERMISSION_DENIED";

            case SpeechRecognizer.ERROR_NETWORK:
                return "SPEECH_NETWORK_ERROR";

            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "SPEECH_NETWORK_TIMEOUT";

            case SpeechRecognizer.ERROR_NO_MATCH:
                return "SPEECH_NO_MATCH";

            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "SPEECH_RECOGNIZER_BUSY";

            case SpeechRecognizer.ERROR_SERVER:
                return "SPEECH_SERVER_ERROR";

            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "SPEECH_TIMEOUT";

            default:
                return "SPEECH_RECOGNITION_FAILED";
        }
    }

    @Override
    protected void handleOnDestroy() {

        destroyRecognizer();

        super.handleOnDestroy();
    }
}