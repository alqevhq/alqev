package com.alqev.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;

@CapacitorPlugin(name = "NativeDocumentCamera")
public class NativeDocumentCameraPlugin extends Plugin {

    private static final String PREFS_NAME =
            "alqev_native_camera";

    private static final String KEY_PENDING_PHOTO_PATH =
            "pending_photo_path";

    private static final String KEY_CAPTURE_PENDING =
            "capture_pending";

    private static final int MAX_JPEG_BYTES =
            900_000;

    private File pendingPhotoFile;

    // ============================================================
    // CAMERA START
    // ============================================================

    @PluginMethod
    public void capture(PluginCall call) {
        try {
            /*
             * Eski ACTION_IMAGE_CAPTURE sistemi kaldırıldı.
             *
             * Artık Xiaomi / sistem kamera uygulaması açılmıyor.
             * ALQEV kendi CameraX Activity'sini açıyor.
             */
            Intent intent =
                    new Intent(
                            getActivity(),
                            AlqevCameraActivity.class
                    );

            startActivityForResult(
                    call,
                    intent,
                    "cameraResult"
            );

        } catch (Exception error) {
            call.reject(
                    "CAMERA_START_FAILED",
                    error
            );
        }
    }

    // ============================================================
    // CAMERA RETURN
    // ============================================================

    @ActivityCallback
    private void cameraResult(
            PluginCall call,
            ActivityResult result
    ) {
        Intent data = result.getData();

        if (
                result.getResultCode()
                        != Activity.RESULT_OK
        ) {
            String errorCode = null;

            if (data != null) {
                errorCode =
                        data.getStringExtra(
                                AlqevCameraActivity.EXTRA_ERROR
                        );
            }

            if (call != null) {
                call.reject(
                        errorCode != null
                                ? errorCode
                                : "CAMERA_CANCELLED"
                );
            }

            return;
        }

        if (data == null) {
            if (call != null) {
                call.reject(
                        "CAMERA_RESULT_MISSING"
                );
            }

            return;
        }

        String photoPath =
                data.getStringExtra(
                        AlqevCameraActivity.EXTRA_PHOTO_PATH
                );

        if (
                photoPath == null
                        || photoPath.trim().isEmpty()
        ) {
            if (call != null) {
                call.reject(
                        "CAMERA_FILE_MISSING"
                );
            }

            return;
        }

        pendingPhotoFile =
                new File(photoPath);

        if (!isPendingPhotoValid()) {
            cleanupPendingFile();

            if (call != null) {
                call.reject(
                        "CAMERA_FILE_MISSING"
                );
            }

            return;
        }

        /*
         * Fotoğraf yolunu önce diske kaydediyoruz.
         * WebView herhangi bir nedenle yeniden oluşursa fotoğraf
         * recovery sistemi tarafından tekrar alınabilir.
         */
        savePendingState(
                pendingPhotoFile.getAbsolutePath()
        );

        /*
         * Capacitor eski JS çağrısını kaybetmişse fotoğrafı
         * silmiyoruz. getPendingResult() daha sonra alabilir.
         */
        if (call == null) {
            pendingPhotoFile = null;
            return;
        }

        try {
            JSObject resultData =
                    createResultFromPendingPhoto();

            cleanupPendingFile();

            call.resolve(
                    resultData
            );

        } catch (OutOfMemoryError error) {
            pendingPhotoFile = null;

            call.reject(
                    "CAMERA_OUT_OF_MEMORY"
            );

        } catch (Exception error) {
            pendingPhotoFile = null;

            call.reject(
                    "CAMERA_PROCESS_FAILED",
                    error
            );
        }
    }

    // ============================================================
    // PROCESS / WEBVIEW RECOVERY
    // ============================================================

    @PluginMethod
    public void getPendingResult(
            PluginCall call
    ) {
        restorePendingPhotoFileIfNecessary();

        JSObject response =
                new JSObject();

        if (!hasPendingCapture()) {
            response.put(
                    "available",
                    false
            );

            call.resolve(
                    response
            );

            return;
        }

        if (!isPendingPhotoValid()) {
            cleanupPendingFile();

            response.put(
                    "available",
                    false
            );

            call.resolve(
                    response
            );

            return;
        }

        try {
            JSObject recovered =
                    createResultFromPendingPhoto();

            recovered.put(
                    "available",
                    true
            );

            cleanupPendingFile();

            call.resolve(
                    recovered
            );

        } catch (OutOfMemoryError error) {
            pendingPhotoFile = null;

            call.reject(
                    "CAMERA_RECOVERY_OUT_OF_MEMORY"
            );

        } catch (Exception error) {
            pendingPhotoFile = null;

            call.reject(
                    "CAMERA_RECOVERY_FAILED",
                    error
            );
        }
    }

    // ============================================================
    // RESULT CREATION
    // ============================================================

    private JSObject createResultFromPendingPhoto()
            throws Exception {

        restorePendingPhotoFileIfNecessary();

        if (!isPendingPhotoValid()) {
            throw new IOException(
                    "CAMERA_FILE_MISSING"
            );
        }

        String base64 =
                createMemorySafeJpegBase64(
                        pendingPhotoFile,
                        1280,
                        68
                );

        JSObject resultData =
                new JSObject();

        resultData.put(
                "base64",
                base64
        );

        resultData.put(
                "mimeType",
                "image/jpeg"
        );

        resultData.put(
                "name",
                "camera-"
                        + System.currentTimeMillis()
                        + ".jpg"
        );

        return resultData;
    }

    // ============================================================
    // PENDING STATE
    // ============================================================

    private SharedPreferences getPreferences() {
        return getContext()
                .getSharedPreferences(
                        PREFS_NAME,
                        Context.MODE_PRIVATE
                );
    }

    private boolean hasPendingCapture() {
        return getPreferences()
                .getBoolean(
                        KEY_CAPTURE_PENDING,
                        false
                );
    }

    private void savePendingState(
            String path
    ) {
        getPreferences()
                .edit()
                .putString(
                        KEY_PENDING_PHOTO_PATH,
                        path
                )
                .putBoolean(
                        KEY_CAPTURE_PENDING,
                        true
                )
                .commit();
    }

    private void clearPendingState() {
        getPreferences()
                .edit()
                .remove(
                        KEY_PENDING_PHOTO_PATH
                )
                .remove(
                        KEY_CAPTURE_PENDING
                )
                .commit();
    }

    private void restorePendingPhotoFileIfNecessary() {
        if (
                pendingPhotoFile != null
                        && pendingPhotoFile.exists()
        ) {
            return;
        }

        String savedPath =
                getPreferences()
                        .getString(
                                KEY_PENDING_PHOTO_PATH,
                                null
                        );

        if (
                savedPath == null
                        || savedPath.trim().isEmpty()
        ) {
            pendingPhotoFile = null;
            return;
        }

        File restored =
                new File(
                        savedPath
                );

        if (restored.exists()) {
            pendingPhotoFile =
                    restored;
        } else {
            pendingPhotoFile =
                    null;

            clearPendingState();
        }
    }

    private boolean isPendingPhotoValid() {
        restorePendingPhotoFileIfNecessary();

        return pendingPhotoFile != null
                && pendingPhotoFile.exists()
                && pendingPhotoFile.length() > 0;
    }

    // ============================================================
    // MEMORY-SAFE IMAGE PROCESSING
    // ============================================================

    private String createMemorySafeJpegBase64(
            File file,
            int maxDimension,
            int quality
    ) throws Exception {

        BitmapFactory.Options bounds =
                new BitmapFactory.Options();

        bounds.inJustDecodeBounds =
                true;

        BitmapFactory.decodeFile(
                file.getAbsolutePath(),
                bounds
        );

        if (
                bounds.outWidth <= 0
                        || bounds.outHeight <= 0
        ) {
            throw new IOException(
                    "INVALID_IMAGE"
            );
        }

        int largestDimension =
                Math.max(
                        bounds.outWidth,
                        bounds.outHeight
                );

        int sampleSize = 1;

        while (
                (largestDimension / sampleSize)
                        > (maxDimension * 2)
        ) {
            sampleSize *= 2;
        }

        BitmapFactory.Options options =
                new BitmapFactory.Options();

        options.inSampleSize =
                Math.max(
                        1,
                        sampleSize
                );

        options.inPreferredConfig =
                Bitmap.Config.RGB_565;

        Bitmap decoded =
                BitmapFactory.decodeFile(
                        file.getAbsolutePath(),
                        options
                );

        if (decoded == null) {
            throw new IOException(
                    "IMAGE_DECODE_FAILED"
            );
        }

        Bitmap output =
                decoded;

        try {
            int width =
                    decoded.getWidth();

            int height =
                    decoded.getHeight();

            int largest =
                    Math.max(
                            width,
                            height
                    );

            if (largest > maxDimension) {
                float scale =
                        (float) maxDimension
                                / (float) largest;

                int targetWidth =
                        Math.max(
                                1,
                                Math.round(
                                        width * scale
                                )
                        );

                int targetHeight =
                        Math.max(
                                1,
                                Math.round(
                                        height * scale
                                )
                        );

                output =
                        Bitmap.createScaledBitmap(
                                decoded,
                                targetWidth,
                                targetHeight,
                                true
                        );
            }

            byte[] bytes =
                    compressJpeg(
                            output,
                            quality
                    );

            if (
                    bytes.length
                            > MAX_JPEG_BYTES
            ) {
                bytes =
                        compressJpeg(
                                output,
                                52
                        );
            }

            if (
                    bytes.length
                            > MAX_JPEG_BYTES
            ) {
                bytes =
                        compressJpeg(
                                output,
                                42
                        );
            }

            if (
                    bytes.length
                            > MAX_JPEG_BYTES
            ) {
                throw new IOException(
                        "IMAGE_TOO_LARGE"
                );
            }

            return Base64.encodeToString(
                    bytes,
                    Base64.NO_WRAP
            );

        } finally {
            if (
                    output != decoded
                            && !output.isRecycled()
            ) {
                output.recycle();
            }

            if (!decoded.isRecycled()) {
                decoded.recycle();
            }
        }
    }

    private byte[] compressJpeg(
            Bitmap bitmap,
            int quality
    ) throws IOException {

        try (
                ByteArrayOutputStream stream =
                        new ByteArrayOutputStream()
        ) {
            if (
                    !bitmap.compress(
                            Bitmap.CompressFormat.JPEG,
                            quality,
                            stream
                    )
            ) {
                throw new IOException(
                        "IMAGE_COMPRESS_FAILED"
                );
            }

            return stream.toByteArray();
        }
    }

    // ============================================================
    // CLEANUP
    // ============================================================

    private void cleanupPendingFile() {
        if (pendingPhotoFile == null) {
            restorePendingPhotoFileIfNecessary();
        }

        if (pendingPhotoFile != null) {
            try {
                if (pendingPhotoFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    pendingPhotoFile.delete();
                }
            } catch (Exception ignored) {
                // Cleanup hatası ALQEV'i kapatmamalı.
            }

            pendingPhotoFile = null;
        }

        clearPendingState();
    }
}