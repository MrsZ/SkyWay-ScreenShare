/// <reference path="typings/tsd.d.ts" />

module SkyWay {

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    export interface getUserMediaOptionsObject {
        video: {
            mozMediaSource: string;
            mediaSource: string;
            width?: {
                min: number;
                max: number;
            };
            height?: {
                min: number;
                max: number;
            };
            frameRate?: {
                min: number;
                max: number;
            };
        };
        audio: boolean;
    }

    export interface getUserMediaChromeMandatoryObject {
        mandatory: {
            chromeMediaSource: string;
            chromeMediaSourceId: string;
            maxWidth?: number;
            maxHeight?: number;
            maxFrameRate?:number;
            minWidth?: number;
            minHeight?: number;
            minFrameRate?:number;
        };
        optional: any;
    }

    export interface getUserMediaIEOptionsObject {
        video: {
            optional: {
                sourceId: string;
            }
        };
        audio: boolean;
    }

    export interface gUMParamObject {
        Width?: number;
        Height?: number;
        FrameRate?: number;
    }

    export interface optionsObject {
        debug: boolean;
    }

    declare var window;

    export class ScreenShare {

        private _debug: boolean = false;

        constructor(options:optionsObject=null){
            if(options !== null &&'debug' in options) this._debug = options.debug;
        }

        public startScreenShare(param:gUMParamObject,success:{(stream:MediaStream)}, error:{(error:Error)}, onEndedEvent = null):void{

            if(!!navigator.mozGetUserMedia) {

                // for FF
                var _paramFirefox: getUserMediaFirefoxOptionsObject = {
                    video: {
                        mozMediaSource: 'window',
                        mediaSource: 'window'
                    },
                    audio: false
                };

                if(isFinite(param.Width)) _paramFirefox.video.width = {min: param.Width,max: param.Width};
                if(isFinite(param.Height)) _paramFirefox.video.height = {min: param.Height,max: param.Height};
                if(isFinite(param.FrameRate)) _paramFirefox.video.frameRate = {min: param.FrameRate,max: param.FrameRate};

                this.logger("Parameter of getUserMedia : " + JSON.stringify(_paramFirefox));

                navigator.mozGetUserMedia(_paramFirefox, (stream)=>{
                    success(stream);
                }, (err)=>{
                    this.logger("Error message of getUserMedia : " + JSON.stringify(err));
                    error(err);
                });

            }else if(!!navigator.webkitGetUserMedia){

                // for Chrome
                var _paramChrome: getUserMediaChromeMandatoryObject = {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: ''
                    },
                    optional: [{
                        googTemporalLayeredScreencast: true
                    }]
                };

                if(isFinite(param.Width)) {
                    _paramChrome.mandatory.maxWidth = param.Width;
                    _paramChrome.mandatory.minWidth = param.Width;
                };
                if(isFinite(param.Height)) {
                    _paramChrome.mandatory.maxHeight = param.Height;
                    _paramChrome.mandatory.minHeight = param.Height;
                };
                if(isFinite(param.FrameRate)) {
                    _paramChrome.mandatory.maxFrameRate = param.FrameRate;
                    _paramChrome.mandatory.minFrameRate = param.FrameRate;
                };

                window.addEventListener('message',(event:MessageEvent)=>{
                    this.logger("Received " + '"' + event.data.type + '"' + " message from Extension.");
                    if(event.data.type != 'gotStreamId') {
                        return;
                    }
                    _paramChrome.mandatory.chromeMediaSourceId = event.data.streamid;
                    this.logger("Parameter of getUserMedia : " + JSON.stringify(_paramChrome));
                    navigator.getUserMedia({
                        audio: false,
                        video: _paramChrome
                    }, (stream)=>{
                        this.logger("Got a stream for screen share");
                        var streamTrack = stream.getVideoTracks();
                        streamTrack[0].onended = (event)=>{
                            this.logger("Stream ended event fired : " + JSON.stringify(event));
                            if(typeof(onEndedEvent) !== "undefined" && onEndedEvent !== null) onEndedEvent();
                        };
                        success(stream);
                    }, (err)=>{
                        this.logger("Error message of getUserMedia : " + JSON.stringify(err));
                        error(err);
                    });

                });

                window.postMessage({type:"getStreamId"},"*");
            } else if(window.AdapterJS && AdapterJS.WebRTCPlugin && AdapterJS.WebRTCPlugin.isPluginInstalled) {
                // would be fine since no methods
                var _paramIE: getUserMediaIEOptionsObject = {
                    video: {
                        optional: [{
                            sourceId: AdapterJS.WebRTCPlugin.plugin.screensharingKey || 'Screensharing'
                        }]
                    },
                    audio: false
                };

                // wait for plugin to be ready
                AdapterJS.WebRTCPlugin.callWhenPluginReady(function() {
                    // check if screensharing feature is available
                    if (!!AdapterJS.WebRTCPlugin.plugin.HasScreensharingFeature &&
                        !!AdapterJS.WebRTCPlugin.plugin.isScreensharingAvailable) {
                        navigator.getUserMedia(_paramIE,
                        (stream)=>{
                            _this.logger("Got a stream for screen share");
                            var streamTrack = stream.getVideoTracks();
                            streamTrack[0].onended = (event)=>{
                                _this.logger("Stream ended event fired : " + JSON.stringify(event));
                                if(typeof(onEndedEvent) !== "undefined") onEndedEvent();
                            };
                            success(stream);
                        }, (err)=>{
                            _this.logger("Error message of getUserMedia : " + JSON.stringify(err));
                            error(err);
                        });
                    } else {
                        throw new Error('Your WebRTC plugin does not support screensharing');
                    }
                });
            }
        }

        public stopScreenShare():boolean{
            // todo : It plans to implement
            return false;
        }

        public isEnabledExtension():boolean{
            if(typeof (window.ScreenShareExtentionExists) === 'boolean' ||
                (window.AdapterJS && AdapterJS.WebRTCPlugin && AdapterJS.WebRTCPlugin.isPluginInstalled))
            {
                this.logger('ScreenShare Extension available');
                return true
            } else{
                this.logger('ScreenShare Extension not available');
                return false
            }
        }

        private logger(message:any):void{
            if(this._debug){
                console.log("SkyWay-ScreenShare: "+message);
            }
        }

    }
}

