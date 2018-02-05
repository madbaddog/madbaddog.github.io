document.addEventListener("DOMContentLoaded", function(){
//     var decoder = new _qrdecoder('outcanvas', 240, 180);
//     decoder.start()
//     .then(function(data){
//         console.log(data);
//     });   

});

    function switchCam(){
        //decoder.switchCamera();
            video = document.getElementById('video');
            video.style.width = document.width + 'px';
            video.style.height = document.height + 'px';
            video.setAttribute('autoplay', '');
            video.setAttribute('muted', '');
            video.setAttribute('playsinline', '');

            var constraints = {
                 audio: false,
                 video: {
                     facingMode: 'user'
                 }
            }

            navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {
                video.srcObject = stream;
            });
    } 
