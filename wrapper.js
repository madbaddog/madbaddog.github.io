function getFilters() {
    var Filters = {};

    Filters.filterImage = function (filter, imageData, var_args) {
        //var args = [this.getPixels(image)];
        var args = [imageData];
        for (var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return filter.apply(null, args);
    };

    Filters.grayscale = function (pixels, args) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            // CIE luminance for the RGB
            // The human eye is bad at seeing red and blue, so we de-emphasize them.
            var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        return pixels;
    };

    Filters.threshold = function (pixels, threshold) {
        var d = pixels.data;
        for (var i = 0; i < d.length; i += 4) {
            var r = d[i];
            var g = d[i + 1];
            var b = d[i + 2];
            var v = (0.2126 * r + 0.7152 * g + 0.0722 * b >= threshold) ? 255 : 0;
            d[i] = d[i + 1] = d[i + 2] = v;
        }
        return pixels;
    };


    Filters.tmpCanvas = document.createElement('canvas');
    Filters.tmpCtx = Filters.tmpCanvas.getContext('2d');

    Filters.createImageData = function (w, h) {
        return this.tmpCtx.createImageData(w, h);
    };

    function truncate(num) {
        if (num < 0)
            return 0;
        if (num > 255)
            return 255;
        else
            return num;
    }
    Filters.contrast = function (pixels, contrast) {//-255 to 255

        var d = pixels.data;
        var factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        for (var i = 0; i < d.length; i += 4) {

            var R = (factor * (d[i] - 128) + 128);

            R = truncate(R);  //изображения серые, поэтому достаточно рассчитать только для красного
            d[i] = d[i + 1] = d[i + 2] = R;

        }
        return pixels;
    };

    Filters.sobel = function(pixels){
        var d = pixels.data;
        var prevPixel = 0;
        var currentPixel = 0;
        var dx = 0;
        for (var i = 0; i < d.length; i += 4) {
            currentPixel = d[i];
            dx = currentPixel - prevPixel;
            prevPixel = d[i];
            if (dx > 1) dx+= 20;
            d[i] = d[i + 1] = d[i + 2] = dx;
        }   
        return pixels;
    }

    return Filters;
}

function parseqr(qr) {
    var params = qr.split("&");
    var docInfo = new Object();
    params.forEach(function (param) {

        var key = param.split("=");
        switch (key[0]) {
            case "s":
                docInfo.s = key[1];
                break;
            case "t":
                docInfo.t = key[1];
                break;
            case "fn":
                docInfo.fn = key[1];
                break;
            case "i":
                docInfo.fd = key[1];
                break;
            case "fp":
                docInfo.fp = key[1];
                break;
            case "n":
                docInfo.n = key[1];
                break;
        }
    });
    return docInfo;

}

function validateqr(qr) {
    if (qr.t && qr.s && qr.fn && qr.fp && qr.fd)
        return true;
    else
        return false;
}


function getCameras() {
    return new Promise(function (resolve, reject) {
        navigator.mediaDevices.enumerateDevices()
                .then(function (devices) {
                    var cameras = [];
                    devices.forEach(function (device) {
                        if (device.kind === "videoinput") {                                            
                            if (device.label.indexOf("back") !== -1) {
                                cameras.unshift(device.deviceId);
                            } else cameras.push(device.deviceId);                                       
                        }                                       
                    });
                    resolve(cameras);
                });
    });
}

function getStream(video, cameraId) {
    return new Promise(function (resolve, reject) {
    
        navigator.mediaDevices.getUserMedia({
            video: {frameRate: 24, deviceId: cameraId}
        })
                .then(function (stream) {
                    if ("srcObject" in video) {
                        video.srcObject = stream;
                    } else {
                        video.src = window.URL.createObjectURL(stream);
                    }
                    resolve();
                })
                .catch(function (e) {
                    console.log(e);
                });
    })

}



function videoHandler(video) {
    var cropedcanvas = document.createElement("canvas");
    var cropedctx = cropedcanvas.getContext('2d');
    var bluredcanvas = document.createElement("canvas");
    var bluredctx = bluredcanvas.getContext('2d');
    var vw = video.videoWidth;
    var vh = video.videoHeight;

    this.cropImage = function (w, h) {
        vw = video.videoWidth;
        vh = video.videoHeight;
        cropedctx.canvas.width = w;
        cropedctx.canvas.height = h;
        //params: image, source dx, source dy, sw, sh, dx, dy, dw, dh
        cropedctx.drawImage(video, vw / 2 - w / 2, vh / 2 - h / 2, w, h, 0, 0, w, h);
        cropedctx.rect(0, 0, w, h);
        cropedctx.lineWidth = "5";
        cropedctx.setLineDash([10, 15]);
        cropedctx.stroke();
        return cropedcanvas;
    };
    this.blurImage = function (w, h) {
        vw = video.videoWidth;
        vh = video.videoHeight;
        bluredctx.canvas.width = w;
        bluredctx.canvas.height = h;
        bluredctx.filter = 'blur(3px)';
        bluredctx.drawImage(video, vw / 2 - w / 2, vh / 2 - h / 2, w, h, 0, 0, w, h);
        return bluredcanvas;
    };
}

function decoderqr(Filters) {
    var ctx;
    var qrcanvas = document.createElement("canvas");
    var qrctx = qrcanvas.getContext('2d');

    var init = function (ctx) {
        qrctx.canvas.width = ctx.canvas.width;
        qrctx.canvas.height = ctx.canvas.height;
    };

    qrcode.canvas_qr2 = qrcanvas;
    qrcode.qrcontext2 = qrctx;

    this.decode = function (canvas) {
        return new Promise(function (resolve, reject) {
            ctx = canvas.getContext('2d');
            init(ctx);

            function decoded(r) {
                r = parseqr(r);
                if (validateqr(r))
                    resolve(r);
            }

            var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            imageData = Filters.filterImage(Filters.grayscale, imageData);                            
            ctx.putImageData(imageData, 0, 0);
            step1(ctx, qrctx)
                    .then(decoded, null);
            step2(ctx, qrctx)
                    .then(decoded, null);
            step3(ctx, qrctx)
                    .then(decoded, null);
        });
    };
    function step1(ctx, qrctx) {
        return new Promise(function (resolve, reject) {
            var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            qrctx.putImageData(imageData, 0, 0);

            try {
                var result = qrcode.decode();
                resolve(result);
            } catch (e) {

            }
        });
    }
    ;


    function step2(ctx, qrctx) {
        return new Promise(function (resolve, reject) {
            var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            var data = Filters.filterImage(Filters.contrast, imageData, 110);
            qrctx.putImageData(data, 0, 0);
            try {
                var result = qrcode.decode();
                resolve(result);
            } catch (e) {

            }
        });
    }
    ;


    function step3(ctx, qrctx) {
        return new Promise(function (resolve, reject) {
            var imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            var data = Filters.filterImage(Filters.threshold, imageData, 100);
            qrctx.putImageData(data, 0, 0);
            try {
                var result = qrcode.decode();
                resolve(result);
            } catch (e) {

            }
        });
    }
    ;
}
function _qrdecoder(outcanvasid, boxsize, qrframesize) {

    var outcanvas = document.getElementById(outcanvasid);
    var outcontext = outcanvas.getContext('2d');
    outcontext.canvas.width = boxsize;
    outcontext.canvas.height = boxsize;
    var video = document.createElement("video");
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');    
    var interval;
    var Filters = getFilters();
    var currentCamera = 0;
    var camerasCount;

    this.switchCamera = function () {
        currentCamera++;
        if (currentCamera === camerasCount)
            currentCamera = 0;
        this.stop();
        getCameras()
                .then(function (camerasArray) {
                    getStream(video, camerasArray[currentCamera]);
                });
    };


    this.start = function () {
        return new Promise(function (resolve, reject) {

            getCameras()
                    .then(function (camerasArray) {
                        camerasCount = camerasArray.length;
                        getStream(video, camerasArray[currentCamera]);
                    })

                    .then(function () {
                            var handler = new videoHandler(video);
                            var decoder = new decoderqr(Filters);
                            var canvas = null;
                            var onDetect = function(result){
                                clearInterval(interval);
                                stop();
                                resolve(result);                                                
                            }                                            
                            interval = setInterval(function () {                                                 
                                canvas = handler.blurImage(boxsize, boxsize);
                                outcontext.drawImage(canvas, 0, 0);
                                canvas = handler.cropImage(qrframesize, qrframesize);
                                outcontext.drawImage(canvas, (boxsize - qrframesize) / 2, (boxsize - qrframesize) / 2);
                                decoder.decode(canvas).then(function (result) {                       
                                    onDetect(result);
                                });
                            }, 1000 / 24);

                    });
        });

    };
    this.stop = function () {
        var stream;
        if ("srcObject" in video) {
            stream = video.srcObject;

        } else {
            stream = video.src;
        }

        var tracks = stream.getTracks();
        tracks.forEach(function (track) {
            track.stop();
        });
        stream = null;                        
    };

}
