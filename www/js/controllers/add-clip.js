'use strict';

angular.module('bazaarr').controller('AddClipCtrl',
function($scope, $state, $q, $timeout, $window, $interval, $cordovaCamera, $cordovaInAppBrowser, $ionicPopup, $rootScope, $ionicLoading, $ionicScrollDelegate,
UserService, AddClipService, DeviceAdapterService, CollectionService, ClipService, AccountService, ClipsService, 
ToastService, HttpService, ImageService, ValidateService) {
    if (!UserService.is_login) {
        
        if($state.includes('reclip')) {
            UserService.post_login.redirect     = "reclip";
            UserService.post_login.params       = {clipId : $state.params.clipId};

            ToastService.showMessage("danger", "Please sign in to make reclips");
        }
        
        $state.go('login');
        return false;
    }
    var defaultClip = {
        category: {
            tid: '_none',
            name: 'None'
        },
        node: {
            currency: 'USD'
        }
    };

    $scope.is_ready = DeviceAdapterService.is_ready;

    $scope.allCurrency = currency;

    $scope.categories = [];
    
    $scope.old_bid = 0;

    $scope.clip = angular.copy(defaultClip);
// p($scope.clip);
    CollectionService.load(UserService.user.uid).then(function(data){
        $scope.collections = data.data;//CollectionService.user_collections;
        var default_collection = Object.keys(CollectionService.add_clip_collection).length ? CollectionService.add_clip_collection : data.data[0];
        CollectionService.add_clip_collection = {};
        
        if (angular.isUndefined($scope.clip.node.ph_bid) || $scope.clip.node.ph_bid === '') {
            $scope.setCollection(default_collection.bid, default_collection.name);
        }
        $ionicScrollDelegate.resize();
    });

    CollectionService.getCategories(2).then(function(data){
        $scope.categories = data.data;
    });

    $scope.deleteClip = function(nid) {
        var confirmPopup = $ionicPopup.confirm({
            title: 'Delete clip',
            template: 'Are you sure you want to delete this clip?',
            cssClass: 'confirm'
        });
        confirmPopup.then(function(res) {
            if(res) {
                AddClipService.deleteClip(nid).then(function(data){
                    ToastService.showMessage("success", "Clip successfully deleted!");
                    //$scope.clip         = angular.copy(defaultClip);
                    $scope.image_src    = null;
                    HttpService.clearCache();
                    
                    CollectionService.clear($scope.clip.node.collection_id);
                    
                    if (angular.isDefined($rootScope.backState[$rootScope.backState.length - 1]) 
                            && $rootScope.backState[$rootScope.backState.length - 1].state === "clip") {
                        $rootScope.backState.pop();
                    }
                    $rootScope.back();
                    
                    AddClipService.postProcessClipDelete($scope.clip.node.ph_bid);
                },
                function(reason) {
                    $scope.err_mess = reason.data;
                });
            } else {

            }
        });

    }


    $scope.setCollection = function(bid, name) {
        if(!bid){
            $scope.data = {};

            $scope.clip.node.ph_bid         = '';
            $scope.clip.node.ph_bid_search  = '';
            var setCollectionPopup          = $ionicPopup.show({
                title: 'Enter new collection',
                template: '<input type="text" ng-model="data.new_col">',
                scope: $scope,
                buttons: [
                    {
                        text: 'Cancel',
                        onTap: function(e) {
                            $scope.data = {};
                        }
                    },
                    {
                      text: 'Save',
                      type: 'button-positive',
                      onTap: function(e) {
                          if (!$scope.data.new_col) {
                              // error
                              e.preventDefault();
                          } else {
                              return $scope.data.new_col;
                          }
                      }
                    }
                ]
            });

            setCollectionPopup.then(function(res) {
                if(angular.isDefined(res)){
                    var new_col = {
                        name: res
                    };
                    CollectionService.add(new_col).then(function(data){
                        $scope.collections.push(data.data);
                        $scope.clip.node.ph_bid         = data.data.bid;
                        $scope.clip.node.ph_bid_search  = data.data.name;
                    }, function(reason) {
                        ToastService.showDrupalFormMessage("danger", reason.data);
                    });
                }
            });
            return;
        }

        $scope.clip.node.ph_bid         = bid;
        $scope.clip.node.ph_bid_search  = name;
    }

    $scope.addClip = function(clip, file) {
//p(clip);p(file);return
        $ionicLoading.show();
        if(clip.node.nid) {

            var node = {
                node: {
                    nid:            clip.node.nid,
                    uid:            clip.node.uid,
                    type:           'clip',
                    /*field_category: {
                        und: {
                            values: clip.category.tid || 0
                        }
                    },*/
                    ph_bid:             clip.node.ph_bid,
                    body_value:         clip.node.body_value,
                    title:              clip.node.title,
                    reclip:             clip.node.reclip == "1" ? 1 : null,
                    currency:           clip.node.currency,
                    price_value:        clip.node.price_value,
                    ph_bid_title:       clip.node.ph_bid_search,
                    is_cover:           parseInt(clip.node.is_cover),
                    send_to_facebook:   parseInt(clip.node.send_to_facebook)
                }
            }
			
            if (angular.isDefined(clip.category.tid) && clip.category.tid) {
                node.node.field_category            = {};
                node.node.field_category.und        = {}
                node.node.field_category.und.values = clip.category.tid;
            }

            AddClipService.saveClip(node).then(function(data){
                ToastService.showMessage("success", "Clip successfully saved");
                
                $scope.image_src = null;
                
                //after editing clip, load data from server, not from clip_list
                ClipService.load_from_server        = true;

                //update full clip view and other views with this clip
                HttpService.clearCache();
                
                AddClipService.postProcessClipUpdate(clip.node.ph_bid, $scope.old_bid);
                if (clip.node.ph_bid !== $scope.old_bid) {
                    CollectionService.updateCollectionField($scope.old_bid, "clips_count", -1, "increment");
                    CollectionService.updateCollectionField(clip.node.ph_bid, "clips_count", 1, "increment");
                }
                
                //update cover of collection
                if (parseInt(clip.node.is_cover)) {
                    CollectionService.updateCollectionField(clip.node.ph_bid, "cover_img", clip.node.img_large, "update");
                }
                
                $rootScope.back();
                
                $ionicLoading.hide();
            }, function(reason) {
                $ionicLoading.hide();
                ToastService.showDrupalFormMessage("danger", reason.data);
            });
            return;
        }

        AddClipService.addFile(file).then(function(data){
            clip.node.type              = "clip";
            clip.node.field_clip_image  = {"und" : [{"fid" : data.data.fid}]};
            clip.node.img_large         = data.data.url;
            
            if(clip.category) {
                clip.node.field_category  = {"und" : {"values" : clip.category.tid}};
            }
            delete clip.category;
            delete clip.currency;
			
            AddClipService.saveClip(clip).then(function(data){
                //$scope.clip = angular.copy(defaultClip);
                $scope.image_src = null;

                if (!DeviceAdapterService.is_ready) {
                    var canvas = document.getElementById('canvas');
                    if (angular.isDefined(canvas)) {
                        canvas.style.display    = 'none';
                    }
                }

                AccountService.updateCounts();//updateCounts('clips_count', 1);
                HttpService.clearCache();
                $ionicLoading.hide();
                ToastService.showMessage("success", "Clip successfully added!");

                $rootScope.backEvent = true;
                $rootScope.backState.push({'state' : 'recent'});
                $state.go('clip', {clipId: data.data.nid});
                
                AddClipService.postProcessClipInsert(clip.node.ph_bid, data.data.nid);
                
                //update cover of collection
                if (parseInt(clip.node.is_cover)) {
                    CollectionService.updateCollectionField(clip.node.ph_bid, "cover_img", clip.node.img_large, "update");
                }
            }, function(reason) {
                $ionicLoading.hide();
                //ToastService.showMessage("danger", reason.data);
                ToastService.showDrupalFormMessage("danger", reason.data);
                //$scope.err_mess = reason.data;
            })
        },
        function(reason) {
            $ionicLoading.hide();
            if (angular.isDefined(reason.data)) {
                ToastService.showMessage("danger", reason.data);
            }
            else {
                ToastService.showDrupalFormMessage("danger", reason.data);
            }
        });
    }

    $scope.files = []
    $scope.changedFile = function(element) {
        $scope.$apply(function($scope) {
            // Turn the FileList object into an Array
            setCanvasImage(element);
        });
    };

    $scope.openPhotoSourcePopup = function() {
        $scope.photo_source_popup = $ionicPopup.show({
            title: 'Select source',
            templateUrl: 'views/popups/photo_source.html',
            scope: $scope
        });
    };

    $scope.closeImagePopup = function() {
        $scope.photo_source_popup.close();
    }

    $scope.addPhoto = function(source_type_id) {
        $scope.photo_source_popup.close();
        if (!DeviceAdapterService.is_ready) {
            return false;
        }
        $cordovaCamera.getPicture(DeviceAdapterService.getCameraOptions(source_type_id)).then(function(imageData) {
            $scope.file.file = imageData;
            $scope.image_src = "data:image/jpeg;base64," + imageData;
        }, function(err) {
            ToastService.showMessage("danger", err);
        });
    }

    $scope.reclipClip = function(clip, bid, cacheClean) {
        if(!clip){
            $state.go('add-collection', {action:'reclip', clipId: $state.params.clipId});
            return false;
        }
        $ionicLoading.show();
        var reclip = ClipService.formatReclip(clip, bid);
        AddClipService.addReclip(reclip).then(function(data){
            ToastService.showMessage("success", "Reclip succesfully added");
            $scope.reclip = {};
            HttpService.clearCache();
            $ionicLoading.hide();
            
            $rootScope.back();
            
            AddClipService.postProcessClipInsert(bid);
        },
        function(reason) {
            ToastService.showMessage("danger", reason.data);
        });
    };

    $scope.scrollToAdvance = function() {
        $ionicScrollDelegate.scrollBottom();
    };

    var clipit_loop 		= 0;
    var button_added 		= false;
    
    var ref = {};
    
    $scope.openUrlPopup = function() {
        $scope.photo_source_popup.close();
        /*$scope.url = {};
        $scope.url.data = "";
        $scope.url_popup = $ionicPopup.show({
            title: 'Images search',
            template: '<input type="text" placeholder="Enter url" ng-model="url.data">',
            scope: $scope,
            buttons: [
                {
                    text: 'Cancel'
                },
                {
                    text: 'Search',
                    type: 'button-positive',
                    onTap: function(e) {
                        if (!ValidateService.validate($scope.url.data, "url")) {
                            e.preventDefault();
                            return false;
                        }
                        searchImages($scope.url.data);
                    }
                }
            ]
        });*/
        ref = $window.open('https://google.com', '_blank', 'location=yes,clearcache=no,clearsessioncache=no');
        ref.addEventListener('loadstart', function() {
            button_added = false;
            clearInterval(clipit_loop);
        });
        ref.addEventListener('loadstop', addClipItBtn);
        ref.addEventListener('loaderror', addClipItBtn);
        ref.addEventListener('exit', function() {
            button_added = false;
            clearInterval(clipit_loop);
            ref.removeEventListener('loadstart');
            ref.removeEventListener('loadstop');
            ref.removeEventListener('loaderror');
            ref.removeEventListener('exit');
        });
		
		//ref.show();
        /*$cordovaInAppBrowser.open("https://google.com", "_blank", DeviceAdapterService.getInAppBrowserConfig())
        .then(function(event) {
			
        });*/
    };
    
    /*$rootScope.$on('$cordovaInAppBrowser:loadstart', function(e, event){
        button_added = false;
        clearInterval(clipit_loop);

        //$cordovaInAppBrowser.executeScript({
        //    code: "localStorage.setItem('url', '')"
        //});
    });

    $rootScope.$on('$cordovaInAppBrowser:loadstop', function(e, event){
        addClipItBtn();
    });

    $rootScope.$on('$cordovaInAppBrowser:loaderror', function(e, event){
        addClipItBtn();
    });

    $rootScope.$on('$cordovaInAppBrowser:exit', function(e, event){
        clearInterval(clipit_loop);
        button_added = false;
    });*/

    function addClipItBtn() {
        button_added = false;
        clearInterval(clipit_loop);
        
        $timeout(function(){
            ref.insertCSS({
                code: '.bazaarr-clip-it{width:100%;top:100%;position:fixed;bottom:0;padding:0;box-sizing:border-box;z-index:99999;background:#fff;}.bazaarr-clip-it.expanded{top:0; overflow-y: scroll;} .bazaarr-clip-it.expanded > span {display: none;} .images-list {text-align: center; padding-top: 46px;}.bazaarr-clip-it .cancel-btn{display:none}.bazaarr-clip-it.expanded .cancel-btn{display:block;position:absolute;top:0;right:0;font-size:20px;padding:10px;color:#43a5a6;text-decoration:none}.bazaarr-clip-it span{display:block;position:fixed;bottom:0;left:0;font-size:22px;background:#43a5a6;color:#FFF;text-align:center;text-decoration:none;width:100px;padding:10px;margin:20px;box-sizing:border-box}.bazaarr-clip-it img{  margin: 0 1%; max-width: 48%; margin-top: 20px;} .bazaarr-clip-it.expanded .error-message {font-size: 16px; max-width: 80%; margin: 0 auto;}'
            }, function() {
                //alert("addcss");
                $timeout(function(){
                    ref.executeScript({
                        code: 'localStorage.setItem("clip",{});var bazaarrClipItShow=function(){var a=document.getElementsByClassName("bazaarr-clip-it")[0];if(!a.classList.contains("expanded")){a.classList.add("expanded");for(var e=document.querySelectorAll("img"),t=!1,r=0;r<e.length;r++){var i=e[r].parentNode.getAttribute("href"),n="";null!==i&&(n=bazaarrGetQueryVariable(i,"imgurl"));var l=n||e[r].src,t=r===e.length-1?!0:!1;bazaarrLoadImage(l,t)}}},bazaarrClipImage=function(a){var e={};e.img=a.src,e.url=window.location.href,localStorage.setItem("clip",JSON.stringify(e))},bazaarrClipItHide=function(a){var e=document.getElementsByClassName("bazaarr-clip-it")[0];e.classList.remove("expanded");var t=e.getElementsByClassName("images-list")[0];t.innerHTML="",a.preventDefault()},bazaarrClipItInsert=function(){if(!document.getElementsByClassName("bazaarr-clip-it").length>0){var a=document.createElement("div");a.className="bazaarr-clip-it",a.innerHTML=\'<span onclick="bazaarrClipItShow()">Clip It!</span><a href="#" class="cancel-btn" onclick="bazaarrClipItHide(event)">Cancel</a><div class="images-list"></div>\',document.body.insertBefore(a,document.body.firstChild)}},bazaarrGetQueryVariable=function(a,e){for(var t=a.substring(a.indexOf("?")+1).split("&"),r=0;r<t.length;r++){var i=t[r].split("=");if(decodeURIComponent(i[0])==e)return decodeURIComponent(i[1])}},bazaarrLoadImage=function(a,e){var t=document.getElementsByClassName("bazaarr-clip-it")[0],r=t.getElementsByClassName("images-list")[0],i=new Image;i.onload=function(){i.width>320&&i.height>320&&(r.appendChild(i),i.addEventListener("click",function(){bazaarrClipImage(this)})),e&&!r.querySelectorAll("img").length&&(r.innerHTML=\'<div class="error-message">Image not found or is too small to add - it should be more then 320*320</div>\')},i.src=a};bazaarrClipItInsert();'
                    }, function() {
                        button_added = true;
                        //alert("addjs");
                    });
                }, 500);
            });
        }, 1500);
        
        clipit_loop = setInterval(function() {
            if (button_added) {
                //alert("check");
                ref.executeScript({
                    code: 'localStorage.getItem("clip")'
                }, function(values) {
                    //alert("checkjs");
                    var clip = JSON.parse(values[0]);
                    if (Object.keys(clip).length) { // url && url.length > 10
                        ref.close();
                        //$scope.selectWebImage(url);
                        setClipFromWeb(clip);
                    }
                });
            }
        }, 500);

        /*
        $cordovaInAppBrowser.insertCSS({
            code: '.bazaarr-clip-it{width:100%;top:100%;position:fixed;bottom:0;padding:0;box-sizing:border-box;z-index:99999;background:#fff;transition:all 1s;}.bazaarr-clip-it.expanded{top:0; overflow-y: scroll;} .bazaarr-clip-it.expanded > span {display: none;} .images-list {text-align: center; padding-top: 46px;}.bazaarr-clip-it .cancel-btn{display:none}.bazaarr-clip-it.expanded .cancel-btn{display:block;position:absolute;top:0;right:0;font-size:20px;padding:10px;color:#43a5a6;text-decoration:none}.bazaarr-clip-it span{display:block;position:fixed;bottom:0;left:0;font-size:22px;background:#43a5a6;color:#FFF;text-align:center;text-decoration:none;width:100px;padding:10px;margin:20px;box-sizing:border-box}.bazaarr-clip-it img{  margin: 0 1%; max-width: 48%; margin-top: 20px;} .bazaarr-clip-it.expanded .error-message {font-size: 16px; max-width: 80%; margin: 0 auto;}'
        }).then(function(){
            p("loadcss");
            $cordovaInAppBrowser.executeScript({
                code: 'localStorage.setItem("url","");var bazaarrClipItShow=function(){var e=document.getElementsByClassName("bazaarr-clip-it")[0];if(!e.classList.contains("expanded")){e.classList.add("expanded");for(var a=e.getElementsByClassName("images-list")[0],t=document.querySelectorAll("img"),r=0;r<t.length;r++){var l=new Image;l.src=t[r].src,l.addEventListener("click",function(){bazaarrClipImage(this)}),l.width>320&&l.height>320&&a.appendChild(l)}a.querySelectorAll("img").length||(a.innerHTML=\'<div class="error-message">Image not found or is too small to add - it should be more then 320*320</div>\')}},bazaarrClipImage=function(e){localStorage.setItem("url",e.src)},bazaarrClipItHide=function(e){var a=document.getElementsByClassName("bazaarr-clip-it")[0];a.classList.remove("expanded");var t=a.getElementsByClassName("images-list")[0];t.innerHTML="",e.preventDefault()},bazaarrClipItInsert=function(){if(!document.getElementsByClassName("bazaarr-clip-it").length>0){var e=document.createElement("div");e.className="bazaarr-clip-it",e.innerHTML=\'<span onclick="bazaarrClipItShow()">Clip It!</span><a href="#" class="cancel-btn" onclick="bazaarrClipItHide(event)">Cancel</a><div class="images-list"></div>\',document.body.insertBefore(e,document.body.firstChild)}};bazaarrClipItInsert();'
            }).then(function() {
                button_added = true;
                p("loadbutton");
                clipit_loop = setInterval(function() {
                    if (button_added) {
                        $cordovaInAppBrowser.executeScript({
                            code: "localStorage.getItem('url')"
                        }).then(function(values) {
                            var url = values[0];
                            if (url && url.length > 10) {
                                $cordovaInAppBrowser.close();
                                $scope.selectWebImage(url);
                            }
                        });
                    }
                }, 1000);
            });
        });*/
    }
    
    function setClipFromWeb(clip) {
    	$scope.selectWebImage(clip.img);
        $scope.clip.node.source_url = clip.url.substring(0, 255);
    }

    $scope.selectWebImage = function(url) {
        $ionicLoading.show();
        $timeout(function(){
            ImageService.convertImgToBase64URL(url).then(function(data) {
                $scope.file.file = data;
                $scope.image_src = data;
                $ionicLoading.hide();
            }, function() {
                $ionicLoading.hide();
            });
        }, 1000);
    };

    $scope.file = {};

    if($state.includes('reclip')){
        ClipService.nodeLoad($state.params.clipId).then(function(data){
            $scope.reclip       = angular.copy(data.data[0]);
            $scope.image_src    = $scope.reclip.img;
            if(CollectionService.collectionId){
                $scope.reclipClip($scope.reclip, CollectionService.collectionId, 1);
                CollectionService.collectionId = 0;
            }
        });

    }

    if($state.includes('edit-clip')){
        $scope.clip.node        = {};
        $scope.clip.node.nid    = $state.params.clipId
        ClipService.nodeLoad($state.params.clipId).then(function(data){
            if(!data.data[0]){
                ToastService.showMessage("danger", "No such clip");
                $rootScope.back();
                return false;
            }
            $scope.old_bid = parseInt(data.data[0].collection_id);
            $scope.clip.node = data.data[0];
            if($scope.clip.node.uid != UserService.user.uid) {
                $state.go('recent');
            }

            $scope.clip.node.ph_bid         = $scope.clip.node.collection_id;
            $scope.clip.node.ph_bid_title   = $scope.clip.node.collection_name;
            $scope.clip.node.body_value     = $scope.clip.node.desc;
            $scope.clip.category.tid        = $scope.clip.node.category.tid || null;

            if ($scope.clip.category.tid !== null && $scope.clip.category.tid) {
                //TODO: broadcast category name
                $timeout(function(){
                    angular.forEach($scope.categories, function(value, key) {
                        if (value.tid === $scope.clip.category.tid) {
                            $scope.clip.category.name = value.name;
                        }
                    });
                }, 1000);
            }

            $scope.clip.node.currency       = $scope.clip.node.currency.code;
            $scope.clip.node.price_value    = parseFloat($scope.clip.node.price) || "";
        });
    }

    function setCanvasImage(element, _url){
        var canvas      = document.getElementById('canvas'),
            MAX_WIDTH   = document.getElementById('canvas_wrapp').clientWidth,
            img         = new Image();

        var f           = element.files[0],
            url         = window.URL || window.webkitURL,
            src         = url.createObjectURL(f);

        var FR= new FileReader();
        FR.onload = function(e) {
            $scope.file.file    = e.target.result;
            img.src             = src;
        };
        FR.readAsDataURL(f);
        img.onload = function() {
            if (img.width > MAX_WIDTH) {
                img.height *= MAX_WIDTH / img.width;
                img.width   = MAX_WIDTH;
            }
            var ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display    = 'block';
            canvas.width            = img.width;
            canvas.height           = img.height;

            ctx.drawImage(img, 0, 0, img.width, img.height);
            url.revokeObjectURL(src);
        };
    }

    function searchImages(url) {
        AddClipService.searchImages(url).then(function(data) {
            //$scope.url_popup.close();
            //data.data.imgs = data.data.imgs.slice(0, 9);
            checkImages(data.data.imgs);
        }, function(reason) {
            //$scope.url_popup.close();
            ToastService.showMessage("danger", reason.data);
        });
    };

    function checkImages(imgs) {
        $ionicLoading.show({duration : 0});
        var prom = []
        angular.forEach(imgs, function(value, key) {
            prom.push(ImageService.checkSizeFromUrl(value));
        });

        $q.all(prom).then(function (data) {
            $scope.imgs = [];
            angular.forEach(data, function(value, key) {
                if (value.status === 1) {
                    $scope.imgs.push(value.url);
                }
            });
            if ($scope.imgs.length === 0) {
                ToastService.showMessage("danger", "Image not found or is too small to add - it should be more then 320*320");
            }
            else {
                openImagesPopup();
            }
            $ionicLoading.hide();
        });
    };

    function openImagesPopup() {
        $scope.images_popup = $ionicPopup.show({
            title: 'Select Image',
            templateUrl: 'views/popups/images.html',
            scope: $scope,
            buttons: [
                {
                    text: 'Cancel'
                }
            ]
        });
    };
});

angular.module('bazaarr').service('AddClipService', function($q, $ionicLoading, HttpService, ImageService) {

    this.deleteClip = function(nid) {
        HttpService.view_url = "node/" + nid;

        return HttpService.dell();
    }

    this.addReclip = function(params) {
        HttpService.view_url = "reclip";
        HttpService.params   = params;

        return HttpService.post();
    };

    this.saveClip = function(clip) {
        HttpService.view_url = "node";
        HttpService.params   = clip;
        if(clip.node.nid){
            HttpService.view_url += '/' + clip.node.nid;
            return HttpService.put();
        }

        return HttpService.post();
    };

    this.addFile = function(file) {
        if (angular.isUndefined(file.file)) {
            return $q.reject({'data' : 'Image field is required'});
        }
        var that = this;
        return ImageService.checkSize(file.file).then(function() {
            return that.sendFile(file);
        }, function(reason) {
            return $q.reject({'data' : reason.data});
        });
    };

    this.sendFile = function(file) {
        file.filename = "device.jpg";
        file.filepath = "public://clip_images/" + file.filename;

        HttpService.view_url = "file";
        HttpService.params   = file;
        return HttpService.post();
    };

    this.searchImages = function(url) {
        $ionicLoading.show();
        HttpService.view_url = "search-web-images";
        HttpService.params   = {"url" : url};
        var promise = HttpService.post();

        promise.then(function() {
            $ionicLoading.hide();
        }, function() {
            $ionicLoading.hide();
        });

        return promise;
    };
    
    this.postProcessClipInsert = function(bid, nid) {
        var data = {"action" : "insert", "nid" : nid};
        this.postProcessClip(bid, data);
    };
    
    this.postProcessClipUpdate = function(bid, old_bid) {
        if (bid === old_bid) {
            return false;
        }
        var data = {"action" : "update", "old_bid" : old_bid};
        this.postProcessClip(bid, data);
    };
    
    this.postProcessClipDelete = function(bid) {
        var data = {"action" : "delete"};
        this.postProcessClip(bid, data);
    };
    
    this.postProcessClip = function(bid, data) {
        HttpService.view_url = "collection/collection_image/" + bid;
        HttpService.params   = {"data": data};
        HttpService.post();
    };
});

angular.module('bazaarr').service('ImageService', function($q, $ionicLoading, DeviceAdapterService) {
    this.checkSize = function(file_base64) {
        var def = $q.defer();

        if (file_base64.length > 10000000) {
            def.reject({'data' : 'Image size must be less than 10 MB'});
        }

        var i = new Image();
        i.onload = function(){
            if (i.width < 320 || i.height < 320) {
                def.reject({'data' : 'Size of image is ' + i.width + " x " + i.height + '. Your image must be more than 320 x 320'});
            }
            def.resolve();
        };
        i.onerror = function () {
            def.reject({'data' : 'Error uploading photo'});
        };
        i.src = file_base64.indexOf("base64") === -1 ? "data:image/png;base64," + file_base64 : file_base64;

        return def.promise;
    };

    this.checkSizeFromUrl = function(url) {
        var def = $q.defer();

        var i = new Image();
        i.onload = function(){
            if (i.width < 320 || i.height < 320) {
                def.resolve({'status' : 0});
            }
            else {
                def.resolve({'status' : 1, 'url' : url});
            }
        };
        i.onerror = function () {
            def.resolve({'status' : 0});
        };
        i.src = url;

        return def.promise;
    };

    this.convertImgToBase64URL = function(url, outputFormat) {
        var def = $q.defer();

        var img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function(){
            var canvas = document.createElement('CANVAS'),
            ctx = canvas.getContext('2d'), dataURL;
            canvas.height = img.height;
            canvas.width = img.width;
            ctx.drawImage(img, 0, 0);
            
            var toDataURLFailed = false;
            try {
            	dataURL = canvas.toDataURL("image/jpeg", 1);
            }
            catch(e) {
            	toDataURLFailed = true; // android may generate png
            }

            if ((toDataURLFailed || dataURL.slice(0, "data:image/jpeg".length) !== "data:image/jpeg")) {
            	try {
                    var encoder = new JPEGEncoder();
                    dataURL = encoder.encode(ctx.getImageData(0, 0, img.width, img.height), 100);
            	}
                catch(e) { 
                	def.reject({'data' : 'Error uploading image'});
                }
            }
            
            //dataURL = canvas.toDataURL();
            //dataURL = dataURL.replace("data:image/png;base64,", "data:image/jpeg;base64,");
            def.resolve(dataURL);
            canvas = null;
        };
        img.onerror = function () {
            def.reject({'data' : 'Error uploading image'});
        };
        img.src = url;

        return def.promise;
    };
});