package com.alqev.app;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;

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

    private File pendingPhotoFile;

    @PluginMethod
    public void capture(PluginCall call) {
        try {
            File cameraDir = new File(getContext().getCacheDir(), "alqev_camera");
            if (!cameraDir.exists() && !cameraDir.mkdirs()) {
                call.reject("CAMERA_CACHE_ERROR");
                return;
            }

            pendingPhotoFile = File.createTempFile(
                    "alqev_" + System.currentTimeMillis() + "_",
                    ".jpg",
                    cameraDir
            );

            Uri outputUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    pendingPhotoFile
            );

            Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT, outputUri);
            intent.setClipData(ClipData.newRawUri("alqev_camera", outputUri));
            intent.addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION |
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            );

            if (intent.resolveActivity(getContext().getPackageManager()) == null) {
                cleanupPendingFile();
                call.reject("CAMERA_NOT_AVAILABLE");
                return;
            }

            startActivityForResult(call, intent, "cameraResult");
        } catch (IOException | IllegalArgumentException error) {
            cleanupPendingFile();
            call.reject("CAMERA_START_FAILED", error);
        }
    }

    @ActivityCallback
    private void cameraResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            cleanupPendingFile();
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK) {
            cleanupPendingFile();
            call.reject("CAMERA_CANCELLED");
            return;
        }

        if (pendingPhotoFile == null || !pendingPhotoFile.exists() || pendingPhotoFile.length() == 0) {
            cleanupPendingFile();
            call.reject("CAMERA_FILE_MISSING");
            return;
        }

        try {
            String base64 = createMemorySafeJpegBase64(pendingPhotoFile, 1280, 72);

            JSObject resultData = new JSObject();
            resultData.put("base64", base64);
            resultData.put("mimeType", "image/jpeg");
            resultData.put("name", "camera-" + System.currentTimeMillis() + ".jpg");

            cleanupPendingFile();
            call.resolve(resultData);
        } catch (OutOfMemoryError error) {
            cleanupPendingFile();
            call.reject("CAMERA_OUT_OF_MEMORY");
        } catch (Exception error) {
            cleanupPendingFile();
            call.reject("CAMERA_PROCESS_FAILED", error);
        }
    }

    private String createMemorySafeJpegBase64(File file, int maxDimension, int quality) throws Exception {
        BitmapFactory.Options bounds = new BitmapFactory.Options();
        bounds.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(file.getAbsolutePath(), bounds);

        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw new IOException("INVALID_IMAGE");
        }

        int sampleSize = 1;
        int largestDimension = Math.max(bounds.outWidth, bounds.outHeight);

        while ((largestDimension / sampleSize) > (maxDimension * 2)) {
            sampleSize *= 2;
        }

        BitmapFactory.Options options = new BitmapFactory.Options();
        options.inSampleSize = Math.max(1, sampleSize);
        options.inPreferredConfig = Bitmap.Config.RGB_565;

        Bitmap decoded = BitmapFactory.decodeFile(file.getAbsolutePath(), options);
        if (decoded == null) {
            throw new IOException("IMAGE_DECODE_FAILED");
        }

        Bitmap output = decoded;

        try {
            int width = decoded.getWidth();
            int height = decoded.getHeight();
            int largest = Math.max(width, height);

            if (largest > maxDimension) {
                float scale = (float) maxDimension / (float) largest;
                int targetWidth = Math.max(1, Math.round(width * scale));
                int targetHeight = Math.max(1, Math.round(height * scale));
                output = Bitmap.createScaledBitmap(decoded, targetWidth, targetHeight, true);
            }

            ByteArrayOutputStream stream = new ByteArrayOutputStream();
            if (!output.compress(Bitmap.CompressFormat.JPEG, quality, stream)) {
                throw new IOException("IMAGE_COMPRESS_FAILED");
            }

            byte[] bytes = stream.toByteArray();
            stream.close();

            if (bytes.length > 1_500_000) {
                ByteArrayOutputStream smallerStream = new ByteArrayOutputStream();
                if (!output.compress(Bitmap.CompressFormat.JPEG, 55, smallerStream)) {
                    throw new IOException("IMAGE_COMPRESS_FAILED");
                }
                bytes = smallerStream.toByteArray();
                smallerStream.close();
            }

            if (bytes.length > 1_500_000) {
                throw new IOException("IMAGE_TOO_LARGE");
            }

            return Base64.encodeToString(bytes, Base64.NO_WRAP);
        } finally {
            if (output != decoded && !output.isRecycled()) {
                output.recycle();
            }
            if (!decoded.isRecycled()) {
                decoded.recycle();
            }
        }
    }

    private void cleanupPendingFile() {
        if (pendingPhotoFile != null) {
            try {
                if (pendingPhotoFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    pendingPhotoFile.delete();
                }
            } catch (Exception ignored) {
            }
            pendingPhotoFile = null;
        }
    }
}