
package com.example.beta

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import android.view.ViewGroup
import android.view.WindowManager
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private var initialized = false

    private val scriptUrl =
        "https://raw.githubusercontent.com/difanpamungkas/beta2/main/Beta%201.2%20UserScript%20%2B%20Sweep.js"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setSoftInputMode(
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
        )

        if (checkSelfPermission(Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(
                arrayOf(Manifest.permission.CAMERA), 100
            )
        } else {
            createWebView()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(
            requestCode, permissions, grantResults
        )

        if (requestCode == 100) {
            createWebView()
            if (grantResults.isEmpty() ||
                grantResults[0] != PackageManager.PERMISSION_GRANTED
            ) {
                Toast.makeText(
                    this,
                    "Izin kamera diperlukan untuk scan barcode",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun createWebView() {
        if (initialized) return
        initialized = true

        webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)

                if (!url.startsWith("https://tsiraw.tsindustri.com/")) {
                    return
                }

                Thread {
                    var connection: HttpURLConnection? = null

                    try {
                        connection = URL(scriptUrl)
                            .openConnection() as HttpURLConnection
                        connection.connectTimeout = 15000
                        connection.readTimeout = 15000

                        val script = connection.inputStream
                            .bufferedReader()
                            .use { it.readText() }

                        runOnUiThread {
                            if (!isFinishing && !isDestroyed) {
                                val quoted = org.json.JSONObject
                                    .quote(script)

                                webView.evaluateJavascript(
                                    "(function(){eval($quoted);})();",
                                    null
                                )
                            }
                        }
                    } catch (e: Exception) {
                        runOnUiThread {
                            Toast.makeText(
                                this@MainActivity,
                                "Script gagal dimuat. Periksa internet.",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    } finally {
                        connection?.disconnect()
                    }
                }.start()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(
                request: PermissionRequest
            ) {
                runOnUiThread {
                    val cameraGranted =
                        checkSelfPermission(Manifest.permission.CAMERA) ==
                        PackageManager.PERMISSION_GRANTED

                    if (cameraGranted &&
                        request.resources.contains(
                            PermissionRequest.RESOURCE_VIDEO_CAPTURE
                        )
                    ) {
                        request.grant(
                            arrayOf(
                                PermissionRequest.RESOURCE_VIDEO_CAPTURE
                            )
                        )
                    } else {
                        request.deny()
                    }
                }
            }
        }

        setContentView(webView)
        webView.loadUrl("https://tsiraw.tsindustri.com/")
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}
