'use strict';
angular.module('bazaarr').controller('AddClipCtrl', [
  '$scope',
  '$state',
  '$q',
  '$timeout',
  '$window',
  '$interval',
  '$cordovaCamera',
  '$cordovaInAppBrowser',
  '$ionicPopup',
  '$rootScope',
  '$ionicLoading',
  '$ionicScrollDelegate',
  'UserService',
  'AddClipService',
  'DeviceAdapterService',
  'CollectionService',
  'ClipService',
  'AccountService',
  'ClipsService',
  'ToastService',
  'HttpService',
  'ImageService',
  'ValidateService',
  function ($scope, $state, $q, $timeout, $window, $interval, $cordovaCamera, $cordovaInAppBrowser, $ionicPopup, $rootScope, $ionicLoading, $ionicScrollDelegate, UserService, AddClipService, DeviceAdapterService, CollectionService, ClipService, AccountService, ClipsService, ToastService, HttpService, ImageService, ValidateService) {
    if (!UserService.is_login) {
      if ($state.includes('reclip')) {
        UserService.post_login.redirect = 'reclip';
        UserService.post_login.params = { clipId: $state.params.clipId };
        ToastService.showMessage('danger', 'Please sign in to make reclips');
      }
      $state.go('login');
      return false;
    }
    var defaultClip = {
        category: {
          tid: '_none',
          name: 'None'
        },
        node: { currency: 'USD' }
      };
    $scope.is_ready = DeviceAdapterService.is_ready;
    $scope.allCurrency = currency;
    $scope.categories = [];
    $scope.old_bid = 0;
    $scope.clip = angular.copy(defaultClip);
    // p($scope.clip);
    CollectionService.load(UserService.user.uid).then(function (data) {
      $scope.collections = data.data;
      //CollectionService.user_collections;
      var default_collection = Object.keys(CollectionService.add_clip_collection).length ? CollectionService.add_clip_collection : data.data[0];
      CollectionService.add_clip_collection = {};
      if (angular.isUndefined($scope.clip.node.ph_bid) || $scope.clip.node.ph_bid === '') {
        $scope.setCollection(default_collection.bid, default_collection.name);
      }
      $ionicScrollDelegate.resize();
    });
    CollectionService.getCategories(2).then(function (data) {
      $scope.categories = data.data;
    });
    $scope.deleteClip = function (nid) {
      var confirmPopup = $ionicPopup.confirm({
          title: 'Delete clip',
          template: 'Are you sure you want to delete this clip?',
          cssClass: 'confirm'
        });
      confirmPopup.then(function (res) {
        if (res) {
          AddClipService.deleteClip(nid).then(function (data) {
            ToastService.showMessage('success', 'Clip successfully deleted!');
            //$scope.clip         = angular.copy(defaultClip);
            $scope.image_src = null;
            HttpService.clearCache();
            if (angular.isDefined($rootScope.backState[$rootScope.backState.length - 1]) && $rootScope.backState[$rootScope.backState.length - 1].state === 'clip') {
              $rootScope.backState.pop();
            }
            $rootScope.back();
            AddClipService.postProcessClipDelete($scope.clip.node.ph_bid);
          }, function (reason) {
            $scope.err_mess = reason.data;
          });
        } else {
        }
      });
    };
    $scope.setCollection = function (bid, name) {
      if (!bid) {
        $scope.data = {};
        $scope.clip.node.ph_bid = '';
        $scope.clip.node.ph_bid_search = '';
        var setCollectionPopup = $ionicPopup.show({
            title: 'Enter new collection',
            template: '<input type="text" ng-model="data.new_col">',
            scope: $scope,
            buttons: [
              {
                text: 'Cancel',
                onTap: function (e) {
                  $scope.data = {};
                }
              },
              {
                text: 'Save',
                type: 'button-positive',
                onTap: function (e) {
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
        setCollectionPopup.then(function (res) {
          if (angular.isDefined(res)) {
            var new_col = { name: res };
            CollectionService.add(new_col).then(function (data) {
              $scope.collections.push(data.data);
              $scope.clip.node.ph_bid = data.data.bid;
              $scope.clip.node.ph_bid_search = data.data.name;
            }, function (reason) {
              ToastService.showDrupalFormMessage('danger', reason.data);
            });
          }
        });
        return;
      }
      $scope.clip.node.ph_bid = bid;
      $scope.clip.node.ph_bid_search = name;
    };
    $scope.addClip = function (clip, file) {
      //p(clip);p(file);return
      $ionicLoading.show();
      if (clip.node.nid) {
        var node = {
            node: {
              nid: clip.node.nid,
              uid: clip.node.uid,
              type: 'clip',
              ph_bid: clip.node.ph_bid,
              body_value: clip.node.body_value,
              reclip: clip.node.reclip == '1' ? 1 : null,
              currency: clip.node.currency,
              price_value: clip.node.price_value,
              ph_bid_title: clip.node.ph_bid_search,
              is_cover: parseInt(clip.node.is_cover)
            }
          };
        if (angular.isDefined(clip.category.tid) && clip.category.tid) {
          node.node.field_category = {};
          node.node.field_category.und = {};
          node.node.field_category.und.values = clip.category.tid;
        }
        AddClipService.saveClip(node).then(function (data) {
          ToastService.showMessage('success', 'Clip successfully saved');
          //AccountService.updateCounts();//UserService.updateCounts('clips_count', 1);
          //$scope.clip = angular.copy(defaultClip);
          $scope.image_src = null;
          //after editing clip, load data from server, not from clip_list
          ClipService.load_from_server = true;
          /*ClipService.clip.desc               = clip.node.body_value;
                ClipService.clip.price              = clip.node.price_value;
                ClipService.clip.collection_name    = clip.node.ph_bid_search;
                ClipService.clip.collection_id      = clip.node.ph_bid;*/
          //update full clip view and other views with this clip
          HttpService.clearCache();
          //$state.go('clip', {clipId: node.node.nid});
          $ionicLoading.hide();
          $rootScope.back();
          AddClipService.postProcessClipUpdate(clip.node.ph_bid, $scope.old_bid);
          if (clip.node.ph_bid !== $scope.old_bid) {
            CollectionService.updateCollectionField($scope.old_bid, 'clips_count', -1, 'increment');
            CollectionService.updateCollectionField(clip.node.ph_bid, 'clips_count', 1, 'increment');
          }
          //update cover of collection
          if (parseInt(clip.node.is_cover)) {
            CollectionService.updateCollectionField(clip.node.ph_bid, 'cover_img', clip.node.img_large, 'update');
          }
        }, function (reason) {
          $ionicLoading.hide();
          ToastService.showDrupalFormMessage('danger', reason.data);
        });
        return;
      }
      AddClipService.addFile(file).then(function (data) {
        clip.node.type = 'clip';
        clip.node.field_clip_image = { 'und': [{ 'fid': data.data.fid }] };
        clip.node.img_large = data.data.url;
        if (clip.category) {
          clip.node.field_category = { 'und': { 'values': clip.category.tid } };
        }
        delete clip.category;
        delete clip.currency;
        AddClipService.saveClip(clip).then(function (data) {
          //$scope.clip = angular.copy(defaultClip);
          $scope.image_src = null;
          if (!DeviceAdapterService.is_ready) {
            var canvas = document.getElementById('canvas');
            if (angular.isDefined(canvas)) {
              canvas.style.display = 'none';
            }
          }
          AccountService.updateCounts();
          //updateCounts('clips_count', 1);
          HttpService.clearCache();
          $ionicLoading.hide();
          ToastService.showMessage('success', 'Clip successfully added!');
          $rootScope.backEvent = true;
          $rootScope.backState.push({ 'state': 'recent' });
          $state.go('clip', { clipId: data.data.nid });
          AddClipService.postProcessClipInsert(clip.node.ph_bid, data.data.nid);
          //update cover of collection
          if (parseInt(clip.node.is_cover)) {
            CollectionService.updateCollectionField(clip.node.ph_bid, 'cover_img', clip.node.img_large, 'update');
          }
        }, function (reason) {
          $ionicLoading.hide();
          //ToastService.showMessage("danger", reason.data);
          ToastService.showDrupalFormMessage('danger', reason.data);  //$scope.err_mess = reason.data;
        });
      }, function (reason) {
        $ionicLoading.hide();
        if (angular.isDefined(reason.data)) {
          ToastService.showMessage('danger', reason.data);
        } else {
          ToastService.showDrupalFormMessage('danger', reason.data);
        }
      });
    };
    $scope.files = [];
    $scope.changedFile = function (element) {
      $scope.$apply(function ($scope) {
        // Turn the FileList object into an Array
        setCanvasImage(element);
      });
    };
    $scope.openPhotoSourcePopup = function () {
      $scope.photo_source_popup = $ionicPopup.show({
        title: 'Select source',
        templateUrl: 'views/popups/photo_source.html',
        scope: $scope
      });
    };
    $scope.closeImagePopup = function () {
      $scope.photo_source_popup.close();
    };
    $scope.addPhoto = function (source_type_id) {
      $scope.photo_source_popup.close();
      if (!DeviceAdapterService.is_ready) {
        return false;
      }
      $cordovaCamera.getPicture(DeviceAdapterService.getCameraOptions(source_type_id)).then(function (imageData) {
        $scope.file.file = imageData;
        $scope.image_src = 'data:image/jpeg;base64,' + imageData;
      }, function (err) {
        ToastService.showMessage('danger', err);
      });
    };
    $scope.reclipClip = function (clip, bid, cacheClean) {
      if (!clip) {
        $state.go('add-collection', {
          action: 'reclip',
          clipId: $state.params.clipId
        });
        return false;
      }
      $ionicLoading.show();
      var reclip = ClipService.formatReclip(clip, bid);
      AddClipService.addReclip(reclip).then(function (data) {
        ToastService.showMessage('success', 'Reclip succesfully added');
        $scope.reclip = {};
        HttpService.clearCache();
        $ionicLoading.hide();
        $rootScope.backEvent = true;
        $rootScope.backState.push({ 'state': 'recent' });
        $state.go('clip', { clipId: data.data.nid });
        AddClipService.postProcessClipInsert(bid);
      }, function (reason) {
        ToastService.showMessage('danger', reason.data);
      });
    };
    $scope.scrollToAdvance = function () {
      $ionicScrollDelegate.scrollBottom();
    };
    var clipit_loop = 0;
    var button_added = false;
    var ref = {};
    $scope.openUrlPopup = function () {
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
      ref.addEventListener('loadstart', function () {
        button_added = false;
        clearInterval(clipit_loop);
      });
      ref.addEventListener('loadstop', addClipItBtn);
      ref.addEventListener('loaderror', addClipItBtn);
      ref.addEventListener('exit', function () {
        button_added = false;
        clearInterval(clipit_loop);
        ref.removeEventListener('loadstart');
        ref.removeEventListener('loadstop');
        ref.removeEventListener('loaderror');
        ref.removeEventListener('exit');
      });  //ref.show();
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
      $timeout(function () {
        ref.insertCSS({ code: '.bazaarr-clip-it{width:100%;top:100%;position:fixed;bottom:0;padding:0;box-sizing:border-box;z-index:99999;background:#fff;}.bazaarr-clip-it.expanded{top:0; overflow-y: scroll;} .bazaarr-clip-it.expanded > span {display: none;} .images-list {text-align: center; padding-top: 46px;}.bazaarr-clip-it .cancel-btn{display:none}.bazaarr-clip-it.expanded .cancel-btn{display:block;position:absolute;top:0;right:0;font-size:20px;padding:10px;color:#43a5a6;text-decoration:none}.bazaarr-clip-it span{display:block;position:fixed;bottom:0;left:0;font-size:22px;background:#43a5a6;color:#FFF;text-align:center;text-decoration:none;width:100px;padding:10px;margin:20px;box-sizing:border-box}.bazaarr-clip-it img{  margin: 0 1%; max-width: 48%; margin-top: 20px;} .bazaarr-clip-it.expanded .error-message {font-size: 16px; max-width: 80%; margin: 0 auto;}' }, function () {
          //alert("addcss");
          $timeout(function () {
            ref.executeScript({ code: 'localStorage.setItem("clip",{});var bazaarrClipItShow=function(){var a=document.getElementsByClassName("bazaarr-clip-it")[0];if(!a.classList.contains("expanded")){a.classList.add("expanded");for(var e=document.querySelectorAll("img"),t=!1,r=0;r<e.length;r++){var i=e[r].parentNode.getAttribute("href"),n="";null!==i&&(n=bazaarrGetQueryVariable(i,"imgurl"));var l=n||e[r].src,t=r===e.length-1?!0:!1;bazaarrLoadImage(l,t)}}},bazaarrClipImage=function(a){var e={};e.img=a.src,e.url=window.location.href,localStorage.setItem("clip",JSON.stringify(e))},bazaarrClipItHide=function(a){var e=document.getElementsByClassName("bazaarr-clip-it")[0];e.classList.remove("expanded");var t=e.getElementsByClassName("images-list")[0];t.innerHTML="",a.preventDefault()},bazaarrClipItInsert=function(){if(!document.getElementsByClassName("bazaarr-clip-it").length>0){var a=document.createElement("div");a.className="bazaarr-clip-it",a.innerHTML=\'<span onclick="bazaarrClipItShow()">Clip It!</span><a href="#" class="cancel-btn" onclick="bazaarrClipItHide(event)">Cancel</a><div class="images-list"></div>\',document.body.insertBefore(a,document.body.firstChild)}},bazaarrGetQueryVariable=function(a,e){for(var t=a.substring(a.indexOf("?")+1).split("&"),r=0;r<t.length;r++){var i=t[r].split("=");if(decodeURIComponent(i[0])==e)return decodeURIComponent(i[1])}},bazaarrLoadImage=function(a,e){var t=document.getElementsByClassName("bazaarr-clip-it")[0],r=t.getElementsByClassName("images-list")[0],i=new Image;i.onload=function(){i.width>320&&i.height>320&&(r.appendChild(i),i.addEventListener("click",function(){bazaarrClipImage(this)})),e&&!r.querySelectorAll("img").length&&(r.innerHTML=\'<div class="error-message">Image not found or is too small to add - it should be more then 320*320</div>\')},i.src=a};bazaarrClipItInsert();' }, function () {
              button_added = true;  //alert("addjs");
            });
          }, 500);
        });
      }, 1500);
      clipit_loop = setInterval(function () {
        if (button_added) {
          //alert("check");
          ref.executeScript({ code: 'localStorage.getItem("clip")' }, function (values) {
            //alert("checkjs");
            var clip = JSON.parse(values[0]);
            if (Object.keys(clip).length) {
              // url && url.length > 10
              ref.close();
              //$scope.selectWebImage(url);
              setClipFromWeb(clip);
            }
          });
        }
      }, 500);  /*
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
    $scope.selectWebImage = function (url) {
      $ionicLoading.show();
      $timeout(function () {
        ImageService.convertImgToBase64URL(url).then(function (data) {
          $scope.file.file = data;
          $scope.image_src = data;
          $ionicLoading.hide();
        }, function () {
          $ionicLoading.hide();
        });
      }, 1000);
    };
    $scope.file = {};
    if ($state.includes('reclip')) {
      ClipService.nodeLoad($state.params.clipId).then(function (data) {
        $scope.reclip = angular.copy(data.data[0]);
        $scope.image_src = $scope.reclip.img;
        if (CollectionService.collectionId) {
          $scope.reclipClip($scope.reclip, CollectionService.collectionId, 1);
          CollectionService.collectionId = 0;
        }
      });
    }
    if ($state.includes('edit-clip')) {
      $scope.clip.node = {};
      $scope.clip.node.nid = $state.params.clipId;
      ClipService.nodeLoad($state.params.clipId).then(function (data) {
        if (!data.data[0]) {
          ToastService.showMessage('danger', 'No such clip');
          $rootScope.back();
          return false;
        }
        $scope.old_bid = parseInt(data.data[0].collection_id);
        $scope.clip.node = data.data[0];
        if ($scope.clip.node.uid != UserService.user.uid) {
          $state.go('recent');
        }
        $scope.clip.node.ph_bid = $scope.clip.node.collection_id;
        $scope.clip.node.ph_bid_title = $scope.clip.node.collection_name;
        $scope.clip.node.body_value = $scope.clip.node.desc;
        $scope.clip.category.tid = $scope.clip.node.category.tid || null;
        if ($scope.clip.category.tid !== null && $scope.clip.category.tid) {
          //TODO: broadcast category name
          $timeout(function () {
            angular.forEach($scope.categories, function (value, key) {
              if (value.tid === $scope.clip.category.tid) {
                $scope.clip.category.name = value.name;
              }
            });
          }, 1000);
        }
        $scope.clip.node.currency = $scope.clip.node.currency.code;
        $scope.clip.node.price_value = parseFloat($scope.clip.node.price) || '';
      });
    }
    function setCanvasImage(element, _url) {
      var canvas = document.getElementById('canvas'), MAX_WIDTH = document.getElementById('canvas_wrapp').clientWidth, img = new Image();
      var f = element.files[0], url = window.URL || window.webkitURL, src = url.createObjectURL(f);
      var FR = new FileReader();
      FR.onload = function (e) {
        $scope.file.file = e.target.result;
        img.src = src;
      };
      FR.readAsDataURL(f);
      img.onload = function () {
        if (img.width > MAX_WIDTH) {
          img.height *= MAX_WIDTH / img.width;
          img.width = MAX_WIDTH;
        }
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'block';
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        url.revokeObjectURL(src);
      };
    }
    function searchImages(url) {
      AddClipService.searchImages(url).then(function (data) {
        //$scope.url_popup.close();
        //data.data.imgs = data.data.imgs.slice(0, 9);
        checkImages(data.data.imgs);
      }, function (reason) {
        //$scope.url_popup.close();
        ToastService.showMessage('danger', reason.data);
      });
    }
    ;
    function checkImages(imgs) {
      $ionicLoading.show({ duration: 0 });
      var prom = [];
      angular.forEach(imgs, function (value, key) {
        prom.push(ImageService.checkSizeFromUrl(value));
      });
      $q.all(prom).then(function (data) {
        $scope.imgs = [];
        angular.forEach(data, function (value, key) {
          if (value.status === 1) {
            $scope.imgs.push(value.url);
          }
        });
        if ($scope.imgs.length === 0) {
          ToastService.showMessage('danger', 'Image not found or is too small to add - it should be more then 320*320');
        } else {
          openImagesPopup();
        }
        $ionicLoading.hide();
      });
    }
    ;
    function openImagesPopup() {
      $scope.images_popup = $ionicPopup.show({
        title: 'Select Image',
        templateUrl: 'views/popups/images.html',
        scope: $scope,
        buttons: [{ text: 'Cancel' }]
      });
    }
    ;
  }
]);
angular.module('bazaarr').service('AddClipService', [
  '$q',
  '$ionicLoading',
  'HttpService',
  'ImageService',
  function ($q, $ionicLoading, HttpService, ImageService) {
    this.deleteClip = function (nid) {
      HttpService.view_url = 'node/' + nid;
      return HttpService.dell();
    };
    this.addReclip = function (params) {
      HttpService.view_url = 'reclip';
      HttpService.params = params;
      return HttpService.post();
    };
    this.saveClip = function (clip) {
      HttpService.view_url = 'node';
      HttpService.params = clip;
      if (clip.node.nid) {
        HttpService.view_url += '/' + clip.node.nid;
        return HttpService.put();
      }
      return HttpService.post();
    };
    this.addFile = function (file) {
      if (angular.isUndefined(file.file)) {
        return $q.reject({ 'data': 'Image field is required' });
      }
      var that = this;
      return ImageService.checkSize(file.file).then(function () {
        return that.sendFile(file);
      }, function (reason) {
        return $q.reject({ 'data': reason.data });
      });
    };
    this.sendFile = function (file) {
      file.filename = 'device.jpg';
      file.filepath = 'public://clip_images/' + file.filename;
      HttpService.view_url = 'file';
      HttpService.params = file;
      return HttpService.post();
    };
    this.searchImages = function (url) {
      $ionicLoading.show();
      HttpService.view_url = 'search-web-images';
      HttpService.params = { 'url': url };
      var promise = HttpService.post();
      promise.then(function () {
        $ionicLoading.hide();
      }, function () {
        $ionicLoading.hide();
      });
      return promise;
    };
    this.postProcessClipInsert = function (bid, nid) {
      var data = {
          'action': 'insert',
          'nid': nid
        };
      this.postProcessClip(bid, data);
    };
    this.postProcessClipUpdate = function (bid, old_bid) {
      if (bid === old_bid) {
        return false;
      }
      var data = {
          'action': 'update',
          'old_bid': old_bid
        };
      this.postProcessClip(bid, data);
    };
    this.postProcessClipDelete = function (bid) {
      var data = { 'action': 'delete' };
      this.postProcessClip(bid, data);
    };
    this.postProcessClip = function (bid, data) {
      HttpService.view_url = 'collection/collection_image/' + bid;
      HttpService.params = { 'data': data };
      HttpService.post();
    };
  }
]);
angular.module('bazaarr').service('ImageService', [
  '$q',
  '$ionicLoading',
  'DeviceAdapterService',
  function ($q, $ionicLoading, DeviceAdapterService) {
    this.checkSize = function (file_base64) {
      var def = $q.defer();
      if (file_base64.length > 10000000) {
        def.reject({ 'data': 'Image size must be less than 10 MB' });
      }
      var i = new Image();
      i.onload = function () {
        if (i.width < 320 || i.height < 320) {
          def.reject({ 'data': 'Size of image is ' + i.width + ' x ' + i.height + '. Your image must be more than 320 x 320' });
        }
        def.resolve();
      };
      i.onerror = function () {
        def.reject({ 'data': 'Error uploading photo' });
      };
      i.src = file_base64.indexOf('base64') === -1 ? 'data:image/png;base64,' + file_base64 : file_base64;
      return def.promise;
    };
    this.checkSizeFromUrl = function (url) {
      var def = $q.defer();
      var i = new Image();
      i.onload = function () {
        if (i.width < 320 || i.height < 320) {
          def.resolve({ 'status': 0 });
        } else {
          def.resolve({
            'status': 1,
            'url': url
          });
        }
      };
      i.onerror = function () {
        def.resolve({ 'status': 0 });
      };
      i.src = url;
      return def.promise;
    };
    this.convertImgToBase64URL = function (url, outputFormat) {
      var def = $q.defer();
      var img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = function () {
        var canvas = document.createElement('CANVAS'), ctx = canvas.getContext('2d'), dataURL;
        canvas.height = img.height;
        canvas.width = img.width;
        ctx.drawImage(img, 0, 0);
        var toDataURLFailed = false;
        try {
          dataURL = canvas.toDataURL('image/jpeg', 1);
        } catch (e) {
          toDataURLFailed = true;  // android may generate png
        }
        if (toDataURLFailed || dataURL.slice(0, 'data:image/jpeg'.length) !== 'data:image/jpeg') {
          try {
            var encoder = new JPEGEncoder();
            dataURL = encoder.encode(ctx.getImageData(0, 0, img.width, img.height), 100);
          } catch (e) {
            def.reject({ 'data': 'Error uploading image' });
          }
        }
        //dataURL = canvas.toDataURL();
        //dataURL = dataURL.replace("data:image/png;base64,", "data:image/jpeg;base64,");
        def.resolve(dataURL);
        canvas = null;
      };
      img.onerror = function () {
        def.reject({ 'data': 'Error uploading image' });
      };
      img.src = url;
      return def.promise;
    };
  }
]);'use strict';
angular.module('bazaarr').controller('ClipCtrl', [
  '$scope',
  '$state',
  '$timeout',
  '$rootScope',
  '$ionicViewSwitcher',
  '$ionicPopover',
  '$ionicPopup',
  '$cordovaSocialSharing',
  'ClipsService',
  'ClipService',
  'UserService',
  'FollowService',
  'AccountService',
  'ToastService',
  'StateService',
  'ConfigService',
  'clip',
  function ($scope, $state, $timeout, $rootScope, $ionicViewSwitcher, $ionicPopover, $ionicPopup, $cordovaSocialSharing, ClipsService, ClipService, UserService, FollowService, AccountService, ToastService, StateService, ConfigService, clip) {
    /*SliderService.load().then(function(data) {
        if (data.data) {
            $scope.slider       = SliderService.buildNew(data.data);

            if ($scope.slider.index === -1) {
                $scope.slide    = false;
            }
            else {
                $scope.slide    = true;

                ClipService.clip = $scope.slider.clips[$scope.slider.index];
            }
        }
        else {
            $scope.slide    = false;
        }
    }, function(reason) {
        ToastService.showMessage("danger", "Error");
    });*/
    //$scope.slide        = false;
    if (angular.isDefined(clip.data) && clip.data[0]) {
      $scope.clip = clip.data[0];
      $scope.action = false;  //$scope.back_view    = $scope.clip.page_list;
    }
    $scope.orientation_changed = false;
    //$scope.loadClip();
    //p($scope.slide_clips);
    $scope.$on('clip:like', function (event) {
      $scope.clipActionLike();
    });
    $scope.$on('clip:block', function (event) {
      $scope.clipActionBlock();
    });
    $scope.$on('clip:reclip', function (event) {
      $scope.clipActionReclip(ClipService.clip.nid);
    });
    /*$scope.loadClip = function() {
        var clip = SliderService.getClip();
        if (clip.nid) {
            ClipService.clip    = clip;
            $scope.clip         = ClipService.clip;
        }
        else {
            ClipService.load($state.params.clipId).then(function(data){
                ClipService.clip = ClipsService.preRenderSingle(data.data[0]);//data.data[0];
                $scope.clip = ClipService.clip;
                //data.data[0] = $scope.prepareSingle(data.data[0]);
            });
        }
    };*/
    /*$scope.prepareSingle = function(data) {
        data.source_domain = ArrayService.url_domain(data.source_url);

        data.desc = ClipsService.hashtagUrlWrap(data.desc);

        return data;
    };*/
    $scope.nextSlide = function () {
      if (!$scope.action) {
        $timeout(function () {
          var prev_clip_nid = ClipService.clip.nid;
          var clip = ClipService.getClip(1);
          $ionicViewSwitcher.nextDirection('up');
          if (Object.keys(clip).length) {
            goToClip(clip);
          } else {
            ToastService.showMessage('danger', 'No more clips in collection');
          }
          $scope.action = false;
        }, 200);
      }
      $scope.action = true;
    };
    $scope.prevSlide = function () {
      if (!$scope.action) {
        $timeout(function () {
          var clip = ClipService.getClip(-1);
          $ionicViewSwitcher.nextDirection('down');
          goToClip(clip);
          $scope.action = false;
        }, 200);
      }
      $scope.action = true;
    };
    function goToClip(clip) {
      /*$ionicHistory.nextViewOptions({
            disableBack: true
        });*/
      if (clip.nid) {
        //ClipService.clip = clip;
        $state.go('clip', { 'clipId': clip.nid });
      }  //$ionicScrollDelegate.$getByHandle('clipSingle').scrollTop(true);
    }
    $scope.checkSlide = function (index) {
      var page_list = this.page_list || ClipsService.page_api_url;
      //this.clip.page_list || ClipsService.page_api_url;
      var clips = ClipsService.clips[page_list];
      var clip = {};
      angular.forEach(clips, function (value, key) {
        if (value.nid === $state.params.clipId && angular.isDefined(clips[key + index])) {
          clip = clips[key + index];
        }
      });
      if (Object.keys(clip).length) {
        return true;
      } else {
        return false;
      }
    };
    $scope.isList = function () {
      if (ClipService.page_list) {
        return true;
      }
    };
    /*$scope.clipChange = function($index) {
        ClipService.clip        = $scope.slider.clips[$index];
        $state.params.clipId    = ClipService.clip.nid;

        $ionicScrollDelegate.$getByHandle('clipSingle').scrollTop(true);

        if ($scope.slider.counter === ($index + 1)) {
            $ionicLoading.show();
            SliderService.loadMore().then(function(data) {
                $scope.slider       = SliderService.build();
                $scope.slider.index = $index;
                $timeout(function(){
                    $ionicSlideBoxDelegate.update();
                }, 1);
                $ionicLoading.hide();
            });
        }
        else {

            //$scope.slider.index = -1;


            $timeout(function(){
                $scope.slider.clips = SliderService.build().clips;
                //$ionicSlideBoxDelegate.slide($scope.slider.index, 0);

                $ionicSlideBoxDelegate.update();
            }, 1);
        }
    };*/
    // Reclip action
    $scope.clipActionReclip = function (nid) {
      if ($scope.clip_actions_popup) {
        $scope.clip_actions_popup.close();
      }
      if (!UserService.is_login) {
        UserService.post_login.redirect = 'clip';
        UserService.post_login.params = { clipId: ClipService.clip.nid };
        UserService.post_login.broadcast = 'clip:reclip';
        ToastService.showMessage('danger', 'Please sign in to make reclips');
        $state.go('login');
        return false;
      }
      if (!nid) {
        nid = $state.params.clipId;
      }
      if (parseInt(ClipService.clip.uid) === parseInt(UserService.user.uid)) {
        ToastService.showMessage('danger', 'You cannot reclip your clip');
        return false;
      }
      $state.go('reclip', { clipId: nid });
    };
    // Edit action
    $scope.clipActionEdit = function (nid) {
      if ($scope.clip_actions_popup) {
        $scope.clip_actions_popup.close();
      }
      $scope.clipPopover.hide();
      if (!nid) {
        nid = $state.params.clipId;
      }
      $state.go('edit-clip', { clipId: nid });
    };
    // Go to comments
    $scope.clipActionComments = function (nid) {
      if ($scope.clip_actions_popup) {
        $scope.clip_actions_popup.close();
      }
      if (!nid) {
        nid = $state.params.clipId;
      }
      $state.go('comments', { clipId: nid });
    };
    // Like action
    $scope.clipActionLike = function () {
      if ($scope.clip_actions_popup) {
        $scope.clip_actions_popup.close();
      }
      if (!UserService.is_login) {
        UserService.post_login.redirect = 'clip';
        UserService.post_login.params = { clipId: ClipService.clip.nid };
        UserService.post_login.broadcast = 'clip:like';
        ToastService.showMessage('danger', 'Please sign in to like Clips');
        $state.go('login');
        return false;
      }
      if (ClipService.clip.voted) {
        ClipService.clip.voted = 0;
      } else {
        ClipService.clip.voted = 1;
      }
      if (ClipService.clip.voted) {
        ClipService.clip.like_count = (parseInt(ClipService.clip.like_count) || 0) + 1;
      } else {
        ClipService.clip.like_count = parseInt(ClipService.clip.like_count) - 1 || 0;
      }
      //AccountService.updateCounts();//UserService.updateCounts('liked_count', ClipService.clip.voted);
      AccountService.updateCounters('liked_count', ClipService.clip.voted);
      ClipService.likeClip(ClipService.clip);
    };
    // Block
    $scope.clipActionBlock = function () {
      if (!UserService.is_login) {
        UserService.post_login.redirect = 'clip';
        UserService.post_login.params = { clipId: ClipService.clip.nid };
        UserService.post_login.broadcast = 'clip:block';
        ToastService.showMessage('danger', 'Please sign in to make reports on Clip');
        if ($scope.clip_actions_popup) {
          $scope.clip_actions_popup.close();
        }
        if ($scope.clipPopover) {
          $scope.clipPopover.hide();
        }
        $state.go('login');
        return false;
      }
      ClipService.blockClip().then(function (data) {
        ClipService.clip.bloked = data.data.block || 0;
        ClipsService.updateClipInList(ClipService.clip);
        if ($scope.clip_actions_popup) {
          $scope.clip_actions_popup.close();
        }
        $scope.clipPopover.hide();
      });
    };
    $scope.clipFollowUser = function () {
      if (!UserService.is_login) {
        ToastService.showMessage('danger', 'Please sign in to follow User');
        $state.go('login');
        if ($scope.clipPopover) {
          $scope.clipPopover.hide();
        }
        return false;
      }
      var type = ClipService.clip.is_follow_user ? 0 : 1;
      FollowService.followUser(ClipService.clip.uid, type).then(function (data) {
        ClipService.clip.is_follow_user = type;
        FollowService.followUserCallback(type);
        //AccountService.updateCounts();//UserService.updateCounts('following_count', type);
        if ($scope.clip_actions_popup) {
          $scope.clip_actions_popup.close();
        }
        $scope.clipPopover.hide();
        ToastService.showMessage('success', data.data.message);
      });
    };
    $scope.clipFollowCollection = function () {
      if (!UserService.is_login) {
        ToastService.showMessage('danger', 'Please sign in to follow Collection');
        $state.go('login');
        if ($scope.clipPopover) {
          $scope.clipPopover.hide();
        }
        return false;
      }
      var type = ClipService.clip.is_follow_collection ? 0 : 1;
      FollowService.followCollection(ClipService.clip.collection_id, type).then(function (data) {
        ClipService.clip.is_follow_collection = type;
        if ($scope.clip_actions_popup) {
          $scope.clip_actions_popup.close();
        }
        $scope.clipPopover.hide();
        ToastService.showMessage('success', data.data.message);
        FollowService.followUserCallback(type);
      });
    };
    $scope.checkBlocked = function (bloked) {
      return bloked === 0 ? false : true;
    };
    $scope.isOwner = function () {
      if (!ClipService.clip) {
        return false;
      }
      return ClipService.clip.owner.id === UserService.user.uid;
    };
    $scope.isLiked = function () {
      if (!ClipService.clip || angular.isUndefined(ClipService.clip.voted)) {
        return '';
      }
      return ClipService.clip.voted ? 'liked' : '';
    };
    $scope.isFollowUser = function () {
      if (!ClipService.clip) {
        return true;
      }
      return ClipService.clip.is_follow_user ? true : false;
    };
    $scope.isFollowCollection = function () {
      if (!ClipService.clip) {
        return true;
      }
      return ClipService.clip.is_follow_collection ? true : false;
    };
    $scope.isReport = function () {
      if (angular.isUndefined(ClipService.clip)) {
        return false;
      }
      if (angular.isDefined(ClipService.clip.bloked) && 0 === ClipService.clip.bloked) {
        return true;
      }
      return false;
    };
    $scope.canReclip = function () {
      if ($scope.isOwner()) {
        return false;
      }
      if (parseInt(ClipService.clip.reclip) === 1) {
        return false;
      }
      if (parseInt(ClipService.clip.bloked) === 0) {
        return false;
      }
      if (parseInt(ClipService.clip.shared_collection) === 1) {
        return false;
      }
      return true;
    };
    $scope.backClip = function () {
      /*var list_view = ClipService.page_list || "recent";// || $scope.clip.page_list;

        var history         = $ionicHistory.viewHistory();
        var view            = $ionicHistory.currentView();
        var counter         = 0;
        var keepGoing       = true;
        var state           = "";
        var back_view_id    = "";

        if (Object.keys(history.views).length > 1) {
            Object.keys(history.views).reverse().forEach(function(key) {
                if (keepGoing) {
                    var value = history.views[key];
                    if (view === value || (key === back_view_id && value.stateName === "clip")) {
                        back_view_id = value.backViewId;
                        counter--;
                    }
                    else if (key === back_view_id && value.stateName !== "clip") {
                        state = value.stateName;
                        keepGoing = false;
                    }
                }
            });
        }

        //TODO: connect with ClipsService
        var params = {};
        if (list_view === "likes" || list_view === "clips") {
            list_view   = "account." + list_view;
            params      = {"userId" : AccountService.getAccountId()};
        }
        if (list_view.indexOf("collection_clips") === 0) {
            list_view   = "collection";
            params      = {"colId" : $scope.clip.collection_id};
        }
//p(counter);
//p(state);
        $ionicViewSwitcher.nextDirection('back');
        if (counter) { // && list_view.indexOf("account.") === -1
            $ionicHistory.goBack(counter);
        }
        else {
            $state.go(list_view, params);
        }*/
      $rootScope.back();
      if ($scope.orientation_changed) {
        $timeout(function () {
          $rootScope.$broadcast('orientation:change');
        });
        $scope.orientation_changed = false;
      }
    };
    $scope.shareClip = function () {
      if (!$rootScope.is_app) {
        return false;
      }
      var link = ConfigService.server_url() + '/clip/' + $scope.clip.nid;
      var desc = 'Hi! Take a look at this clip on Bazaarr: ' + $scope.clip.desc_text + '\n\r\n';
      //ImageService.convertImgToBase64URL($scope.clip.img_large).then(function(data) {
      $cordovaSocialSharing.share(desc, 'This clip on Bazaarr may be interesting for you!', null, link).then(function (result) {
        ToastService.showMessage('success', 'Successfully sent!');
      }, function (err) {
        ToastService.showMessage('danger', 'Error occured');
      });  //}, function() {
           //    ToastService.showMessage("danger", "Error occured");
           //});
    };
    $scope.toggleDescription = function (isAreaClick) {
      if ($scope.clip.source_url && isAreaClick && !document.body.classList.contains('desc-open')) {
        $scope.openFeed($scope.clip.nid);
      }
      if ($scope.clip.desc_text.length > 50) {
        if (document.body.classList.contains('desc-open') && isAreaClick) {
          var obj = new CutString($scope.clip.desc, 50);
          $scope.clip.full_short_desc = obj.cut();
          document.body.classList.remove('desc-open');
          if ($scope.clip.full_short_desc.length - $scope.clip.full_short_desc.lastIndexOf('...') == 3) {
            $scope.clip.full_short_desc = $scope.clip.full_short_desc.substr(0, $scope.clip.full_short_desc.lastIndexOf('...')) + '<span class="expand">...</span>';
          }
        } else if (!isAreaClick) {
          $scope.clip.full_short_desc = $scope.clip.desc;
          document.body.classList.add('desc-open');
        }
      }  /*if ($scope.clip.source_url && $scope.clip.price > 0) {
            $rootScope.openInApp($scope.clip.source_url, false, $scope.clip.is_video)
        }
        if ($scope.clip.source_url && !$scope.clip.price) {
            $scope.openFeed($scope.clip.nid)
        }*/
    };
    $ionicPopover.fromTemplateUrl('views/menu/clip_popover.html', { scope: $scope }).then(function (popover) {
      $scope.clipPopover = popover;
    });
    $scope.openPopover = function ($event) {
      $scope.clipPopover.show($event);
    };
    $scope.onHold = function (clip) {
      ClipService.clip = clip;
      $scope.clip = ClipService.clip;
      $scope.clip_owner = ClipService.clip.uid == UserService.user.uid;
      $scope.clip_actions_popup = $ionicPopup.show({
        title: 'Clip actions',
        cssClass: 'popup-actions',
        templateUrl: 'views/popups/clip_actions.html',
        buttons: [{ text: 'Cancel' }],
        scope: $scope
      });
    };
    $scope.openFeed = function (nid) {
      StateService.goFeed(nid);
    };
    $scope.$on('orientation:change', function (event) {
      $scope.orientation_changed = true;
    });
  }
]);
angular.module('bazaarr').controller('CommentCtrl', [
  '$scope',
  '$state',
  '$ionicPopup',
  '$ionicLoading',
  'CommentService',
  'UserService',
  'ClipService',
  'ToastService',
  'ClipsService',
  'comments',
  'reclip_users',
  'like_users',
  function ($scope, $state, $ionicPopup, $ionicLoading, CommentService, UserService, ClipService, ToastService, ClipsService, comments, reclip_users, like_users) {
    $scope.comments = comments.data;
    $scope.reclip_users = reclip_users.data;
    $scope.like_users = like_users.data;
    $scope.new_comment = {};
    $scope.new_comment.body_value = '';
    $scope.addComment = function () {
      $ionicLoading.show();
      $scope.new_comment.nid = $state.params.clipId;
      CommentService.add($scope.new_comment).then(function (data) {
        $scope.new_comment.picture = {};
        $scope.new_comment.picture.small = UserService.user.picture;
        $scope.new_comment.name = UserService.user.name;
        $scope.new_comment.uid = UserService.user.uid;
        $scope.new_comment.cid = data.data.cid;
        $scope.comments.push($scope.new_comment);
        $scope.new_comment = {};
        ClipService.clip.comment_count++;
        $ionicLoading.hide();
      }, function (reason) {
        ToastService.showMessage('danger', reason.data);
        $ionicLoading.hide();
      });
    };
    $scope.goLogin = function () {
      UserService.post_login.redirect = 'comments';
      UserService.post_login.params = { clipId: $state.params.clipId };
      $state.go('login');
    };
    $scope.openActionsPopup = function (comment) {
      if (comment.uid !== UserService.user.uid) {
        return false;
      }
      comment.index = this.$parent.$index;
      CommentService.comment = comment;
      $scope.comment_actions_popup = $ionicPopup.show({
        title: 'Comment actions',
        cssClass: 'popup-actions',
        templateUrl: 'views/popups/comment-actions.html',
        buttons: [{
            text: 'Cancel',
            onTap: function (e) {
              $scope.closeActionsPopup();
            }
          }],
        scope: $scope
      });
    };
    $scope.openEditPopup = function () {
      $scope.comment = CommentService.comment;
      $scope.comment_edit_popup = $ionicPopup.show({
        title: 'Edit comment',
        templateUrl: 'views/popups/inputs/comment-edit.html',
        buttons: [
          { text: 'Cancel' },
          {
            text: 'Save',
            onTap: function (e) {
              CommentService.save().then(function (data) {
                $scope.comments[CommentService.comment.index].body_value = $scope.comment.body_value;
              }, function (reason) {
                ToastService.showMessage('danger', reason.data);
              });
            }
          }
        ],
        scope: $scope
      });
      $scope.closeActionsPopup();
    };
    $scope.deleteComment = function () {
      var confirmPopup = $ionicPopup.confirm({
          title: 'Delete comment',
          template: '<div class="delete-text">Are you sure you want to delete this comment?</div>'
        });
      confirmPopup.then(function (res) {
        if (res) {
          CommentService.delete().then(function (data) {
            ClipService.clip.comment_count--;
            $scope.comments.splice(CommentService.comment.index, 1);
            ToastService.showMessage('success', 'Comment successfully deleted!');
          }, function (reason) {
            ToastService.showMessage('danger', reason.data);
          });
        }
      });
      $scope.closeActionsPopup();
    };
    $scope.closeActionsPopup = function () {
      $scope.comment_actions_popup.close();
    };
    $scope.textareaLimit = function (textarea, rows, chars) {
      var newValue;
      if ($scope.new_comment.body_value) {
        var valueSegments = $scope.new_comment.body_value.split('\n');
        if (rows != undefined && valueSegments.length > rows) {
          // too many rows
          newValue = valueSegments.slice(0, rows).join('\n');
        }
        if (chars != undefined && $scope.new_comment.body_value.length > chars) {
          // too many chars
          if (newValue != undefined)
            newValue = newValue.substring(0, chars);
          else
            newValue = $scope.new_comment.body_value.substring(0, chars);
        }
        if (newValue != undefined)
          $scope.new_comment.body_value = newValue;
      }
    };
  }
]);
angular.module('bazaarr').controller('FeedCtrl', [
  '$scope',
  'ClipService',
  'feed_html',
  function ($scope, ClipService, feed_html) {
    $scope.feed_html = feed_html.data;
    $scope.clip = ClipService.clip;
    $scope.$on('clip:load', function () {
      $scope.clip = ClipService.clip;
    });
  }
]);
angular.module('bazaarr').service('FeedService', [
  '$rootScope',
  'HttpService',
  'ClipService',
  function ($rootScope, HttpService, ClipService) {
    this.load = function (nid) {
      HttpService.view_url = 'source-feed/' + nid;
      var promise = HttpService.get();
      /*promise.then(function(data) {
        }, function(reason) {
            
            $rootScope.openInApp(ClipService.clip.source_url, false, ClipService.clip.is_video);
        });*/
      if (angular.isUndefined(ClipService.clip.nid) || ClipService.clip.nid != nid) {
        ClipService.load(nid).then(function () {
          $rootScope.$broadcast('clip:load');
        });
      }
      return promise;
    };
  }
]);
angular.module('bazaarr').service('CommentService', [
  '$q',
  'HttpService',
  function ($q, HttpService) {
    this.comment = {};
    this.load = function (clip_id) {
      HttpService.view_url = 'comments';
      HttpService.params = { 'nid': clip_id };
      return HttpService.get();
    };
    this.add = function (comment) {
      if (!comment.body_value) {
        return $q.reject({ 'data': 'Comment field is required!' });
      }
      HttpService.view_url = 'comment';
      HttpService.params = comment;
      return HttpService.post();
    };
    this.save = function () {
      HttpService.view_url = 'comment/' + this.comment.cid;
      HttpService.params = { 'data': this.comment };
      return HttpService.put();
    };
    this.delete = function () {
      HttpService.view_url = 'comment/' + this.comment.cid;
      return HttpService.delete();
    };
  }
]);
angular.module('bazaarr').controller('SingleClipCtrl', [
  '$scope',
  '$state',
  '$timeout',
  '$ionicScrollDelegate',
  'ClipService',
  'ClipsService',
  'UserService',
  'ArrayService',
  'SliderService',
  function ($scope, $state, $timeout, $ionicScrollDelegate, ClipService, ClipsService, UserService, ArrayService, SliderService) {
  }
]);
angular.module('bazaarr').service('ClipService', [
  '$q',
  '$ionicLoading',
  '$state',
  'HttpService',
  'ClipsService',
  'SearchService',
  function ($q, $ionicLoading, $state, HttpService, ClipsService, SearchService) {
    this.clip = {};
    this.load_from_server = false;
    /*this.load = function(id) {
        HttpService.view_url    = "recent";
        HttpService.params      = {"nid" : id};
        HttpService.is_auth     = false;
        return HttpService.get();
    };*/
    this.load = function (id) {
      $state.params.clipId = id;
      var clip = this.getClip();
      if (clip.nid && !this.load_from_server) {
        this.clip = clip;
        return $q.when({ 'data': [clip] });
      }
      this.load_from_server = false;
      HttpService.view_url = 'recent';
      HttpService.params = { 'nid': id };
      HttpService.is_auth = false;
      var promise = HttpService.get();
      var that = this;
      promise.then(function (data) {
        that.clip = ClipsService.preRenderSingle(data.data[0]);
      });
      return promise;
    };
    this.nodeLoad = function (nid) {
      HttpService.view_url = 'recent';
      HttpService.params = { nid: nid };
      return HttpService.get();
    };
    this.likeClip = function (clip) {
      //$ionicLoading.show();
      HttpService.addNoCache('likes');
      HttpService.view_url = 'vote/' + clip.nid;
      var promise = HttpService.put();
      promise.then(function () {
        $ionicLoading.hide();
      });
      return promise;
    };
    this.formatReclip = function (clip, bid) {
      return {
        ph_bid: bid,
        desc: clip.desc,
        nid: clip.nid
      };
    };
    this.blockClip = function () {
      HttpService.view_url = 'block';
      HttpService.params = {
        nid: this.clip.nid,
        block: typeof this.clip.bloked === 'undefined' ? 1 : this.clip.bloked
      };
      return HttpService.post();
    };
    this.loadMore = function () {
      $ionicLoading.show();
      var that = this;
      var promise = {};
      //ClipsService.loadMore();
      if (this.page_list === 'search') {
        promise = SearchService.loadMore();
      } else {
        promise = ClipsService.loadMore();
      }
      promise.then(function (data) {
        ClipsService.prepare(data.data);
        if (angular.isDefined(data.data[0])) {
          that.preloadImage(data.data[0].img_large);
        }
        $ionicLoading.hide();
      });
      return promise;
    };
    this.getClip = function (index) {
      index = index || 0;
      var preload_index = index >= 0 ? 1 : -1;
      var clip = {};
      var page_list = this.page_list || ClipsService.page_api_url;
      //this.clip.page_list || ClipsService.page_api_url;
      var clips = ClipsService.clips[page_list];
      var that = this;
      angular.forEach(clips, function (value, key) {
        if (value.nid === $state.params.clipId && angular.isDefined(clips[key + index])) {
          clip = clips[key + index];
          if (angular.isDefined(clips[key + index + preload_index])) {
            that.preloadImage(clips[key + index + preload_index].img_large);
          }
          if (clips.length > 2 && key > clips.length - 2) {
            that.loadMore();
          }
        }
      });
      return clip;
    };
    this.preloadImage = function (src) {
      var i = new Image();
      i.src = src;
      i.onload = function () {
      };
    };
  }
]);
angular.module('bazaarr').service('SliderService', [
  '$q',
  '$state',
  '$ionicLoading',
  'ClipsService',
  'ClipService',
  function ($q, $state, $ionicLoading, ClipsService, ClipService) {
    this.clips = [];  /*
    this.load = function() {
        if (angular.isDefined(ClipsService.clips[ClipsService.page_api_url])) {
            return $q.when({"data" : ClipsService.clips[ClipsService.page_api_url]});
        }

        return $q.when({"data" : ""});

        //TODO: loading after refresh a page in web version
        var promise = ClipsService.load();

        promise.then(function(data) {
            ClipsService.prepare(data.data);
        });

        return promise;
    };

    this.loadMore = function() {
        $ionicLoading.show();
        var promise = ClipsService.loadMore();

        promise.then(function(data) {
            ClipsService.prepare(data.data);
            $ionicLoading.hide();
        });

        return promise;
    };

    this.buildNew = function(clips) {
        this.clips = [];
        return this.build(clips);
    };

    this.build = function(clips) {
        clips = clips || ClipsService.clips[ClipsService.page_api_url];

        var slider = {};
        var i = 0;
        var that = this;

        slider.clips    = this.clips;
        //slider.clip_ids = [];
        slider.index    = -1;
        slider.counter  = clips.length;
        angular.forEach(clips, function(value, key) {
            if (value.nid === $state.params.clipId) {
                if (!slider.clips.length) {
                    slider.index = 2;
                    if (angular.isDefined(clips[key - 2])) {
                        slider.clips.push(clips[key - 2]);
                    }
                    else {
                        slider.index = 1;
                    }
                    if (angular.isDefined(clips[key - 1])) {
                        slider.clips.push(clips[key - 1]);
                    }
                    else {
                        slider.index = 0;
                    }
                    slider.clips.push(value);
                    //slider.clip_ids.push(value.nid);
                    if (angular.isDefined(clips[key + 1])) {
                        slider.clips.push(clips[key + 1]);
                    }
                    if (angular.isDefined(clips[key + 2])) {
                        slider.clips.push(clips[key + 2]);
                    }
                }
                else {
                    if (angular.isDefined(clips[key + 2])) {
                        slider.clips.push(clips[key + 2]);
                    }
                }

                if (key > clips.length - 3) {
                    that.loadMore();
                }
            }
            i++;
        });

        this.clips = slider.clips;

        return slider;
    };

    this.getClip = function(index) {
        index           = index || 0;
        var preload_index   = index >= 0 ? 1 : -1;
        var clip = {};
        var page_list = ClipService.clip.page_list || ClipsService.page_api_url;
        var clips = ClipsService.clips[page_list];
        var that = this;

        angular.forEach(clips, function(value, key) {
            if (value.nid === $state.params.clipId && angular.isDefined(clips[key + index])) {
                clip = clips[key + index];

                if (angular.isDefined(clips[key + index + preload_index])) {
                    that.preloadImage(clips[key + index + preload_index].img_large);
                }

                if (key > clips.length - 2) {
                    that.loadMore();
                }
            }
        });

        return clip;
    };

    this.preloadImage = function(src) {
        var i = new Image();
        i.src = src;
        i.onload = function(){

        };
    };*/
  }
]);'use strict';
angular.module('bazaarr').controller('ClipsCtrl', [
  '$scope',
  '$rootScope',
  '$state',
  '$timeout',
  '$cacheFactory',
  '$ionicPopup',
  '$ionicScrollDelegate',
  '$ionicPosition',
  '$ionicNavBarDelegate',
  '$ionicLoading',
  '$ionicHistory',
  'MenuService',
  'ClipsService',
  'SearchService',
  'ClipService',
  'UserService',
  'CollectionService',
  'ToastService',
  'HttpService',
  'FollowService',
  'AccountService',
  'clips',
  function ($scope, $rootScope, $state, $timeout, $cacheFactory, $ionicPopup, $ionicScrollDelegate, $ionicPosition, $ionicNavBarDelegate, $ionicLoading, $ionicHistory, MenuService, ClipsService, SearchService, ClipService, UserService, CollectionService, ToastService, HttpService, FollowService, AccountService, clips) {
    /*$scope.$watch("clips", function(newValue, oldValue){
        p(newValue);
        p(oldValue);
    });*/
    var menu = MenuService.getActiveMenu();
    if (angular.isDefined(clips.data) && clips.data != null && clips.data.length) {
      $scope.clips = ClipsService.prepare(clips.data, '', true);
      if (clips.data.length >= 10) {
        $timeout(function () {
          $scope.is_load_more = true;
        }, 1000);
      }
    } else {
      if (SearchService.isSearch()) {
        ToastService.showMessage('danger', 'We did not find results. Please type a new query');
      } else {
        ToastService.showMessage('danger', 'No clips');
      }
    }
    $scope.subtitle = '';
    $scope.title = Object.keys(menu).length ? menu.name : SearchService.getTitle();
    $scope.loading_more = false;
    //$scope.cols     = ClipsService.getColsNumber();
    if ($state.includes('collection')) {
      setCollection();
    }
    if ($state.includes('hashtag')) {
      $scope.title = '#' + $state.params.hashtagName;
    }
    if ($state.includes('category') && angular.isDefined(clips.data) && angular.isDefined(clips.data[0])) {
      $scope.title = clips.data[0].category_name;
    }
    $scope.swipeLeft = function () {
      MenuService.nextMenu();
    };
    $scope.swipeRight = function () {
      MenuService.prevMenu();
    };
    $scope.openClip = function (clip) {
      //TODO: promise preloader
      ClipService.page_list = ClipsService.page_api_url;
      ClipService.preloadImage(clip.img_large);
      //$timeout(function() {
      $state.go('clip', { clipId: clip.nid }).then(function () {
      });  //}, 200);
    };
    $scope.loadMore = function () {
      //$ionicLoading.show();
      if ($scope.loading_more === true) {
        $scope.$broadcast('scroll.infiniteScrollComplete');
        return false;
      }
      $scope.loading_more = true;
      var service = {};
      if ($state.includes('search-results')) {
        service = SearchService.loadMore();
      } else {
        service = ClipsService.loadMore();
      }
      service.then(function (data) {
        if (data.data == null) {
          $scope.is_load_more = false;
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.loading_more = false;
          return false;
        }
        clips.data = clips.data.concat(data.data);
        $scope.clips = ClipsService.prepare(data.data);
        $timeout(function () {
          $scope.$broadcast('scroll.infiniteScrollComplete');
          $scope.loading_more = false;
        }, 500);
        if (data.data.length < 10) {
          $scope.is_load_more = false;
        }  //$ionicLoading.hide();
      }, function (reason) {
        $scope.$broadcast('scroll.infiniteScrollComplete');
        $scope.loading_more = false;  //$ionicLoading.hide();
      });
    };
    // provide actions on clip
    $scope.onHold = function (clip) {
      ClipService.clip = clip;
      $scope.clip = ClipService.clip;
      $scope.clip_owner = ClipService.clip.uid == UserService.user.uid;
      $scope.clip_actions_popup = $ionicPopup.show({
        title: 'Clip actions',
        cssClass: 'popup-actions',
        templateUrl: 'views/popups/clip_actions.html',
        buttons: [{ text: 'Cancel' }],
        scope: $scope
      });
    };
    $scope.getBlockedClass = function (block) {
      return block === 0 ? 'blocked' : '';
    };
    $scope.isSearch = function () {
      return SearchService.isSearch();
    };
    /*$scope.onScroll = function() {
        return true;

        if (clips.data.length < 100) {
            return false;
        }
        var pos = $ionicScrollDelegate.$getByHandle('clipList').getScrollPosition();
        var pos_top = pos.top - 300;
        var pos_bot = pos.top + window.innerHeight + 300;
        var all_clips = $scope.clips;
        angular.forEach(all_clips, function(clips_row, i){
            var height = 0;
            angular.forEach(clips_row, function(clip, j){
                var clip_el = document.getElementById("clip-" + clip.nid);
                height += clip_el.offsetHeight;//$ionicPosition.position();
                if (height > pos_top && height < pos_bot && all_clips[i][j].list_img === "") {
                    //p("Return: " + all_clips[i][j].img);
                    all_clips[i][j].list_img = all_clips[i][j].img;
                }
                else if ((height < pos_top || height > pos_bot) && all_clips[i][j].list_img !== "") {
                    //p("Remove: " + all_clips[i][j].img);
                    all_clips[i][j].list_img = '';
                }
            });
        });
        $scope.$apply(function(){
            $scope.clips = all_clips;
        });
    };*/
    $scope.doRefresh = function () {
      if ($state.includes('search-results')) {
        $scope.$broadcast('scroll.refreshComplete');
        return false;
      }
      if ($state.current.name.indexOf('account.') > -1) {
        AccountService.update();
      }
      //TODO: remove after prepend new clips functionality
      var $httpDefaultCache = $cacheFactory.get('$http');
      $httpDefaultCache.removeAll();
      //HttpService.addNoCache(ClipsService.page_api_url.replace(/\-\d+/gi, ""));
      ClipsService.pager[ClipsService.page_api_url] = 0;
      ClipsService.load(ClipsService.page_api_url, ClipsService.is_user_page, ClipsService.params).then(function (data) {
        $scope.clips = ClipsService.prepare(data.data, '', true);
        $rootScope.$broadcast('scroll.refreshComplete');
      });
    };
    $scope.$parent.doRefresh = $scope.doRefresh;
    $scope.canEdit = function () {
      if ($rootScope.isMyAccount() && $state.includes('account.collections')) {
        return true;
      }
      return false;
    };
    $scope.$on('orientation:change', function () {
      if (ClipsService.getColsNumber() === ClipsService.size) {
        return false;
      }
      if ($scope.$$phase) {
        $scope.clips = ClipsService.prepare(clips.data);  //applyOrientation
      } else {
        $scope.$apply(function () {
          $scope.clips = ClipsService.prepare(clips.data);  //applyOrientation
        });
      }
      $ionicHistory.clearCache();
    });
    $scope.accept_collection = function (coll, type) {
      var bid = coll.bid;
      CollectionService.accept_collection(bid, type).then(function (data) {
        if (type == 0 || type == 3) {
          $state.go('account.collections', { 'userId': $rootScope.user.uid });
        } else {
          $scope.collection.accepted = '1';
        }
        HttpService.clearCache();
        ToastService.showMessage('success', data.data.messages.status[0]);
      });
    };
    $scope.addClipFromCollection = function (collection) {
      CollectionService.add_clip_collection = collection;
      $state.go('add');
    };
    $scope.goEditCollection = function (bid) {
      $state.go('edit-collection', { collectionId: bid });
    };
    $scope.backCondition = function () {
      if ($state.includes('collection') || $state.includes('hashtag')) {
        $rootScope.back();
      }
    };
    function setCollection() {
      CollectionService.singleLoad($state.params.colId).then(function (data) {
        $scope.collection = data.data[0];
        $scope.title = data.data[0].name;
        $timeout(function () {
          //$scope.title = data.data[0].name;
          $ionicNavBarDelegate.title(data.data[0].name);
        }, 800);
      });
    }
  }
]);
angular.module('bazaarr').service('ClipsService', [
  '$state',
  '$timeout',
  '$ionicLoading',
  'HttpService',
  'AccountService',
  'ArrayService',
  'UserService',
  function ($state, $timeout, $ionicLoading, HttpService, AccountService, ArrayService, UserService) {
    this.pager = {};
    this.page_api_url = 'recent';
    this.is_user_page = false;
    this.params = {};
    this.clips = {};
    //this.clips.length = 0;
    this.newArr = [];
    this.newArrSize = [];
    this.size = 0;
    this.loadMore = function () {
      this.is_more = true;
      this.pager[this.page_api_url] = typeof this.pager[this.page_api_url] === 'undefined' ? 1 : this.pager[this.page_api_url] + 1;
      return this.loadAdapter();
    };
    this.load = function (page, is_user_page, params) {
      this.params = params || {};
      this.is_more = false;
      //TODO: why nested views not cache controller
      if (page === 'clips' || page === 'likes') {
        this.pager[page] = 0;
      }
      return this.loadAdapter(page, is_user_page, params);
    };
    this.loadAdapter = function (page, is_user_page, params) {
      this.page_api_url = page || this.page_api_url;
      this.is_user_page = is_user_page || this.is_user_page;
      //Add id of collection to separate clips from different collections
      if (angular.isDefined(params) && angular.isDefined(params.bid)) {
        this.page_api_url = this.page_api_url + '-' + params.bid;
      }
      if (angular.isDefined(params) && angular.isDefined(params.tid_raw)) {
        this.page_api_url = this.page_api_url + '-' + params.tid_raw;
      }
      HttpService.view_url = this.page_api_url.replace(/\-\d+/gi, '');
      HttpService.page = this.pager[this.page_api_url] || 0;
      HttpService.is_auth = false;
      //this.is_user_page ? true : false;
      HttpService.params = params || this.params;
      if (this.is_user_page) {
        HttpService.params.uid = AccountService.getAccountId();
      }
      return HttpService.get();  /*if (!HttpService.page) {
            $ionicLoading.show();
        }

        var ret = HttpService.get();
        ret.then(function(data) {
            $ionicLoading.hide();
        })

        return ret;*/
    };
    this.chunk_wall = function (arr, size) {
      if (!!arr === false) {
        return false;
      }
      if (this.size && this.size !== size || !this.is_more) {
        this.newArr[this.page_api_url] = [];
        this.newArrSize[this.page_api_url] = [];
      }
      this.size = size;
      var newArr = [];
      var newArrSize = [];
      var j = 0;
      var j_value = 0;
      if (angular.isUndefined(this.newArr[this.page_api_url]) || !this.newArr[this.page_api_url].length) {
        this.newArr[this.page_api_url] = [];
        this.newArrSize[this.page_api_url] = [];
        for (var i = 0; i < size; i++) {
          this.newArr[this.page_api_url][i] = [];
          this.newArrSize[this.page_api_url][i] = 0;
        }
      }
      for (var i = 0; i < arr.length; i++) {
        j_value = this.newArrSize[this.page_api_url].reduce(function (p, v) {
          return p < v ? p : v;
        });
        j = this.newArrSize[this.page_api_url].indexOf(j_value);
        this.newArr[this.page_api_url][j].push(arr[i]);
        if (typeof arr[i].img_h !== 'undefined') {
          this.newArrSize[this.page_api_url][j] += arr[i].img_h;
        }
        if (typeof arr[i].desc !== 'undefined') {
          this.newArrSize[this.page_api_url][j] += Math.ceil(10 / size) * 15;
        }
      }
      return this.newArr[this.page_api_url];
    }, this.chunk_collection = function (arr, size) {
      if (!!arr === false) {
        return false;
      }
      var newArr = [];
      var newArrSize = [];
      var j = 0;
      var j_value = 0;
      for (var i = 0; i < size; i++) {
        newArr[i] = [];
        newArrSize[i] = 0;
      }
      for (var i = 0; i < arr.length; i++) {
        j_value = newArrSize.reduce(function (p, v) {
          return p < v ? p : v;
        });
        j = newArrSize.indexOf(j_value);
        newArr[j].push(arr[i]);
        if (typeof arr[i].img_h !== 'undefined') {
          newArrSize[j] += arr[i].img_h;
        }
        if (typeof arr[i].desc !== 'undefined') {
          newArrSize[j] += Math.ceil(arr[i].desc.length / (7 * size)) * 15;
        }
      }
      return newArr;
    }, this.chunk_table = function (arr, size) {
      if (arr) {
        var chunks = [], i = 0, n = arr.length;
        while (i < n) {
          chunks.push(arr.slice(i, i += size));
        }
        return chunks;
      }
    }, this.applyOrientation = function (data, type) {
      type = type || 'wall';
      var cols = this.getColsNumber();
      if ('table' == type) {
        return this.chunk_table(data, cols);
      }
      switch (type) {
      case 'table':
        return this.chunk_table(data, cols);
        break;
      case 'collection':
        return this.chunk_collection(data, cols);
        break;
      default:
        return this.chunk_wall(data, cols);
        break;
      }
    };
    this.getColsNumber = function () {
      var cols = 2;
      if (window.matchMedia('(orientation: landscape)').matches) {
        cols = 3;
      }
      if (ionic.Platform.isIPad()) {
        cols++;
      }
      return cols;
    };
    this.getCollection = function (bid) {
      HttpService.view_url = 'collection_clips';
      HttpService.params = { 'bid': bid };
      return HttpService.get();
    };
    CutString.prototype.cut = function () {
      var newDiv = document.createElement('div');
      this.searchEnd(this.tempDiv, newDiv);
      return newDiv.innerHTML;
    };
    CutString.prototype.searchEnd = function (parseDiv, newParent) {
      var ele;
      var newEle;
      for (var j = 0; j < parseDiv.childNodes.length; j++) {
        ele = parseDiv.childNodes[j];
        // not text node
        if (ele.nodeType != 3) {
          newEle = ele.cloneNode(true);
          newParent.appendChild(newEle);
          if (ele.childNodes.length === 0)
            continue;
          newEle.innerHTML = '';
          var res = this.searchEnd(ele, newEle);
          if (res)
            return res;
          else {
            continue;
          }
        }
        // the limit of the char count reached
        if (ele.nodeValue.length + this.charCount >= this.limit) {
          newEle = ele.cloneNode(true);
          newEle.nodeValue = ele.nodeValue.substr(0, this.limit - this.charCount) + '...';
          newParent.appendChild(newEle);
          return true;
        }
        newEle = ele.cloneNode(true);
        newParent.appendChild(newEle);
        this.charCount += ele.nodeValue.length;
      }
      return false;
    };
    function cutHtmlString($string, $limit) {
      var output = new CutString($string, $limit);
      return output.cut();
    }
    this.prepare = function (data, page, clear) {
      page = page || this.page_api_url;
      clear = clear || false;
      //p(page);
      var width = Math.round(window.innerWidth * 0.9 / this.getColsNumber());
      if (angular.isUndefined(this.clips[page]) || clear) {
        this.clips[page] = [];
      }
      for (var i = 0; i < data.length; i++) {
        data[i] = this.preRenderSingle(data[i], width, page);
        var clips_length = this.clips[page].push(data[i]);
        data[i].index = clips_length - 1;
      }
      /*var str = "";
angular.forEach(this.clips[page], function(value) {
    str += " - " + value.nid;
});
p(str);*/
      return this.applyOrientation(data);
    };
    this.hashtagUrlWrap = function (str) {
      if (angular.isUndefined(str)) {
        return '';
      }
      var count = (str.match(/href/g) || []).length;
      if (count) {
        return str;
      }
      return str.replace(/#(\S*)/g, '<a href="#/hashtag/$1">#$1</a>');
    };
    this.fakeHashtagUrlWrap = function (str) {
      var count = (str.match(/href/g) || []).length;
      if (count) {
        return str;
      }
      return str.replace(/#(\S*)/g, '<span class="tag">#$1</span>');
    };
    this.preRenderSingle = function (data, width, page) {
      page = page || this.page_api_url;
      data.source_domain = ArrayService.url_domain(data.source_url);
      if (data.desc) {
        var hashtags = data.desc.match(/#\S*/g);
        data.random_hashtag = hashtags ? hashtags[Math.floor(Math.random() * hashtags.length)].substr(1) : '';
      }
      data.desc_text = data.desc;
      data.desc = this.hashtagUrlWrap(data.desc);
      //var obj = new CutString(data.desc, 70);
      if (data.desc_text && data.desc_text.length > 50) {
        var obj = new CutString(this.fakeHashtagUrlWrap(data.desc_text), 50);
      } else {
        var obj = new CutString(data.desc, 50);
      }
      data.full_short_desc = obj.cut();
      if (data.full_short_desc.length - data.full_short_desc.lastIndexOf('...') == 3) {
        data.full_short_desc = data.full_short_desc.substr(0, data.full_short_desc.lastIndexOf('...')) + '<span class="expand">...</span>';
      }
      data.wrap_h = Math.round(width * data.img_h / data.img_w);
      data.img_large_h = Math.round(window.innerWidth * 0.9 * data.img_h / data.img_w);
      data.list_img = data.img;
      data.comment_count = parseInt(data.comment_count);
      data.price = parseFloat(data.price);
      data.page_list = page;
      data.index = 0;
      var c = document.getElementsByClassName('view-container')[0];
      if (c.clientWidth / c.clientHeight > 0.67) {
        data.tablet = 1;
      } else {
        data.tablet = 0;
      }
      return data;
    };
    this.getScreenWidth = function () {
      if (window.matchMedia('(orientation: landscape)').matches) {
        return screen.height;
      }
      return screen.width;
    };
    this.updateClipInList = function (clip) {
      this.clips[clip.page_list][clip.index] = clip;
    };
  }
]);
angular.module('bazaarr').filter('inSlicesOf', [
  'ClipsService',
  function (ClipsService) {
    this.makeSlices = function (items, count) {
      count = count || 2;
      if (!angular.isArray(items))
        return items;
      var array = [];
      var chunkIndex = -1;
      for (var i = 0; i < items.length; i++) {
        //var chunkIndex = parseInt(i / count, 10);
        chunkIndex = chunkIndex === count - 1 ? 0 : chunkIndex + 1;
        if (angular.isUndefined(array[chunkIndex])) {
          array[chunkIndex] = [];
        }
        array[chunkIndex].push(items[i]);
      }
      if (!angular.equals(ClipsService.arrayinSliceOf, array)) {
        ClipsService.arrayinSliceOf = array;
      }
      return ClipsService.arrayinSliceOf;
    };
    return this.makeSlices;
  }
]);'use strict';
angular.module('bazaarr').controller('AccountCollectionListCtrl', [
  '$scope',
  '$rootScope',
  '$state',
  '$ionicHistory',
  'CollectionService',
  'FollowService',
  'AccountService',
  'ClipsService',
  'HttpService',
  'collections',
  'ToastService',
  function ($scope, $rootScope, $state, $ionicHistory, CollectionService, FollowService, AccountService, ClipsService, HttpService, collections, ToastService) {
    $scope.col_width = Math.round(100 / ClipsService.getColsNumber());
    $scope.grouped_list = {};
    FollowService.colls = $scope.grouped_list;
    for (var type in collections.data) {
      $scope.grouped_list[type] = setCollections(collections.data[type], type);
    }
    $scope.goAddCollection = function () {
      $scope.collection = { bid: 'new' };
      $state.go('add-collection').then(function () {
        $rootScope.$broadcast('form:clear');
      });
    };
    function setCollections(collections, type) {
      if ($state.includes('account.collections') && AccountService.is_my_account && collections && collections[0].bid != 0 && type == 'public') {
        collections.unshift({ 'bid': 0 });
      }
      return CollectionService.prepare(collections);
    }
    $scope.isFirst = function (bid) {
      return !!bid === false ? true : false;
    };
    $scope.openCollection = function (id) {
      $state.go('collection', { colId: id }).then(function () {
        $rootScope.$broadcast('update:collection_titles', { bid: id });
      });
    };
    $scope.accept_collection = function (coll, type) {
      var index = this.$parent.$parent.$parent.$index, parent_index = this.$parent.$parent.$parent.$parent.$index, bid = coll.bid;
      CollectionService.accept_collection(bid, type).then(function (data) {
        HttpService.addNoCache('get_user_collections/' + $rootScope.user.uid);
        if (type == 0 || type == 3) {
          $scope.grouped_list[coll.type][parent_index].splice(index, 1);
          if (!$scope.grouped_list[coll.type][parent_index].length) {
            $scope.grouped_list[coll.type].splice(parent_index, 1);
          }
          if (angular.isDefined($scope.grouped_list['shared']) && (!$scope.grouped_list['shared'] || $scope.grouped_list['shared'].length == 0)) {
            delete $scope.grouped_list['shared'];
          }
        } else {
          $scope.grouped_list[coll.type][parent_index][index].accepted = 1;
        }
        ToastService.showMessage('success', data.data.message);
      });
    };
    $scope.goEditCollection = function (bid) {
      $state.go('edit-collection', { collectionId: bid });
    };
    $scope.followCollection = function (coll, type) {
      var send_type = 1 === type ? 0 : 1, bid = coll.bid, parent_index = this.$parent.$parent.$parent.$parent.$index, index = this.$parent.$parent.$parent.$index, is_follow = $scope.account.is_follow;
      FollowService.followCollection(bid, send_type).then(function (data) {
        if (send_type) {
          $scope.account.is_follow = 1;
        }
        if (!data.data.user_follow) {
          $scope.account.is_follow = 0;
        }
        if (data.data.message) {
          ToastService.showMessage('success', data.data.message);
        }
        $scope.grouped_list[coll.type][parent_index][index].follow = send_type;
        FollowService.followUserCallback(send_type);
        if (is_follow !== $scope.account.is_follow) {
          AccountService.updateCounters('followers_count', send_type, true);
        }
      });
    };
    $scope.$parent.doRefresh = function () {
      //$rootScope.$broadcast('scroll.refreshComplete');
      //return true;
      var promise = {};
      HttpService.addNoCache('get_user_collections/' + AccountService.getAccountId());
      promise = CollectionService.load2();
      AccountService.update();
      promise.then(function (data) {
        for (var type in data.data) {
          $scope.grouped_list[type] = setCollections(data.data[type], type);
        }
        $rootScope.$broadcast('scroll.refreshComplete');
      });
    };
    $scope.$on('collections:follow', function (event, args) {
      for (var type in collections.data) {
        collections.data[type] = CollectionService.revertFollow(collections.data[type], args.type);
        $scope.grouped_list[type] = setCollections(collections.data[type], type);  //$scope.types[type] = 1;
      }
    });
    $scope.$on('orientation:change', function (event) {
      $scope.$apply(function () {
        $scope.col_width = Math.round(100 / ClipsService.getColsNumber());
        for (var type in collections.data) {
          $scope.grouped_list[type] = setCollections(collections.data[type], type);  //$scope.types[type] = 1;
        }
      });
      $ionicHistory.clearCache();
    });
  }
]);
angular.module('bazaarr').controller('CollectionListCtrl', [
  '$scope',
  '$rootScope',
  '$state',
  '$timeout',
  '$ionicHistory',
  '$ionicPosition',
  '$ionicScrollDelegate',
  'CollectionService',
  'FollowService',
  'AccountService',
  'ToastService',
  'HttpService',
  'collections',
  function ($scope, $rootScope, $state, $timeout, $ionicHistory, $ionicPosition, $ionicScrollDelegate, CollectionService, FollowService, AccountService, ToastService, HttpService, collections) {
    /*if (!UserService.is_login) {
        $state.go('login');
        return false;
    }*/
    setCollections(collections);
    setCover(0);
    $timeout(function () {
      setPositions();
    });
    $scope.col_width = Math.round(100 / CollectionService.getColsNumber());
    $scope.openClip = function (id, display_id, page, collection_id) {
      $state.go('clip', {
        clipId: id,
        displayId: display_id,
        pageId: page,
        collectionId: collection_id
      });
    };
    $scope.openCollection = function (id) {
      $state.go('collection', { colId: id });
    };
    $scope.isFirst = function (bid) {
      return !!bid === false ? true : false;
    };
    $scope.goAddCollection = function () {
      $scope.collection = {};
      $state.go('add-collection');
    };
    $scope.goEditCollection = function (bid) {
      $state.go('edit-collection', { collectionId: bid });
    };
    $scope.followCollection = function (coll, type) {
      var send_type = 1 === type ? 0 : 1;
      //if ($state.includes("account.collections")) {
      var parent_index = this.$parent.$parent.$parent.$parent.$index;
      var index = this.$parent.$parent.$parent.$index;
      var bid = coll.bid;
      /*}
        else {
            var parent_index    = this.$parent.$parent.$parent.$index;
            var index           = this.$parent.$parent.$parent.$parent.$index;
        }*/
      FollowService.followCollection(bid, send_type).then(function (data) {
        $scope.collections[parent_index][index].follow = send_type;
        FollowService.followCollectionCallback(data.data.user_follow);
      });
    };
    $scope.canEdit = function () {
      if ($rootScope.isMyAccount() && $state.includes('account.collections')) {
        return true;
      }
      return false;
    };
    $scope.$parent.doRefresh = function () {
      var promise = {};
      if ($state.includes('account.following-collections')) {
        HttpService.addNoCache('collections-followed');
        promise = FollowService.loadCollections();
      } else if ($state.includes('account.collections')) {
        HttpService.addNoCache('get_user_collections/' + AccountService.getAccountId());
        promise = CollectionService.load2();
      } else {
        return false;
      }
      AccountService.update();
      promise.then(function (data) {
        setCollections(data);
        $rootScope.$broadcast('scroll.refreshComplete');
      });
    };
    $scope.changeCollection = function (index) {
      setCover(index);
    };
    $scope.getCover = function () {
      return { 'background-image': 'url(' + $scope.cover_img + ')' };
    };
    var already_scroll = false;
    $scope.scrollCollections = function () {
      if (already_scroll) {
        return false;
      }
      already_scroll = true;
      $timeout(function () {
        setNearestCollection($ionicScrollDelegate.getScrollPosition().top);
      }, 1000);
    };
    $scope.accept_collection = function (coll, type) {
      var index = this.$parent.$parent.$parent.$index, parent_index = this.$parent.$parent.$parent.$parent.$index, bid = coll.bid;
      CollectionService.accept_collection(bid, type).then(function (data) {
        HttpService.addNoCache('get_user_collections/' + $rootScope.user.uid);
        if (type == 0 || type == 3) {
          $scope.collections[parent_index].splice(index, 1);
          if (!$scope.collections[parent_index].length) {
            $scope.collections.splice(parent_index, 1);
          }
        } else {
          $scope.collections[parent_index][index].accepted = 1;
        }
        ToastService.showMessage('success', data.data.message);
      });
    };
    var collection_top_positions = [];
    function setPositions() {
      var collection_elements = document.querySelectorAll('.collection');
      angular.forEach(collection_elements, function (value, key) {
        collection_top_positions[key] = $ionicPosition.offset(angular.element(value)).top - 160;
      });
      collection_top_positions.push(100000);
    }
    function setNearestCollection(scroll_pos) {
      //p(scroll_pos);
      var find_nearest = false;
      var scroll_to = 0;
      var index = 0;
      //p(collection_top_positions);
      angular.forEach(collection_top_positions, function (value, key) {
        if (!find_nearest && scroll_pos < value) {
          //p("Pos: " + collection_top_positions[key - 1] + " - " + scroll_pos + " - " + collection_top_positions[key]);
          scroll_to = collection_top_positions[key];
          index = key;
          if (collection_top_positions[key] - scroll_pos > scroll_pos - collection_top_positions[key - 1]) {
            scroll_to = collection_top_positions[key - 1];
            index = key - 1;
          }
          scroll_to = 0 === index ? 0 : scroll_to;
          //p(scroll_to + " - " + index);
          $ionicScrollDelegate.scrollTo(0, scroll_to, true);
          setCover(index);
          find_nearest = true;
          $timeout(function () {
            already_scroll = false;
          }, 500);
        }
      });
    }
    function setCollections(collections) {
      if ($state.includes('account.collections') && AccountService.is_my_account && collections.data[collections.data.length - 1].bid != 0) {
        collections.data.push({ 'bid': 0 });
      }
      $scope.collections = CollectionService.prepare(collections.data);
    }
    function setCover(index) {
      $scope.cover_img = $scope.collections[index].cover_img;
    }
    $scope.$on('collections:follow', function (event, args) {
      collections.data = CollectionService.revertFollow(collections.data, args.type);
      setCollections(collections);
    });
    $scope.$on('orientation:change', function (event) {
      $scope.$apply(function () {
        $scope.col_width = Math.round(100 / CollectionService.getColsNumber());
        /*if ($state.includes('account.collections') && AccountService.is_my_account
                    && !Object.keys($scope.collections[0]).length) {
                CollectionService.collections.unshift({});
            }*/
        $scope.collections = CollectionService.prepare(collections.data);
      });
      $ionicHistory.clearCache();
    });
  }
]);
angular.module('bazaarr').controller('CollectionCtrl', [
  '$scope',
  '$state',
  '$ionicTabsDelegate',
  '$ionicPopup',
  '$timeout',
  'CollectionService',
  'AccountService',
  'CollSharedService',
  'HttpService',
  'UserService',
  'ToastService',
  'collection',
  function ($scope, $state, $ionicTabsDelegate, $ionicPopup, $timeout, CollectionService, AccountService, CollSharedService, HttpService, UserService, ToastService, collection) {
    if ($state.includes('edit-collection')) {
      CollectionService.tmp_collection = angular.isUndefined(collection.data) ? {} : collection.data[0];
    } else {
      if (!CollectionService.tmp_collection) {
        CollectionService.tmp_collection = {};
      }
    }
    CollectionService.getCategories(2).then(function (data) {
      $scope.categories = data.data;
    });
    if (angular.isUndefined(CollectionService.tmp_collection) || angular.isUndefined(CollectionService.tmp_collection.bid)) {
      CollectionService.tmp_collection = { bid: 'new' };
    }
    $scope.collection = CollectionService.tmp_collection;
    $scope.shared = {};
    $scope.shared.user_list = {};
    $scope.search = '';
    $scope.ionicTabsDelegate = $ionicTabsDelegate.$getByHandle('shared-tabs');
    var sent = 0;
    var timeout_id = 0;
    $scope.checked_data = {};
    $scope.$on('form:clear', function (event, args) {
      CollectionService.tmp_collection = { bid: 'new' };
      $scope.collection = CollectionService.tmp_collection;
      $scope.checked_data = {};
    });
    if ($state.includes('shared')) {
      $scope.u_list = {};
      CollectionService.users[UserService.user.uid] = UserService.user.name;
      $scope.saveShared = function (data, bid) {
        var tab = $scope.ionicTabsDelegate.selectedIndex(), params = {
            'bid': bid,
            'type': 'can_view'
          };
        params.uid = {};
        switch (tab) {
        case 0:
          params.uid[0] = 1;
          $scope.checked_data = {};
          break;
        case 1:
          params.uid[UserService.user.uid] = 1;
          $scope.checked_data = {};
          break;
        case 2:
          for (var i in data) {
            if (data[i]) {
              params.uid[i] = 1;
            }
          }
          if (!Object.keys(params.uid).length) {
            ToastService.showMessage('danger', 'Please select users');
            return;
          }
          break;
        }
        CollectionService.tmp_collection.shared = params;
        // p(params);
        if (params.bid && /^-{0,1}\d*\.{0,1}\d+$/.test(params.bid)) {
          $state.go('edit-collection', { 'collectionId': params.bid });
          return;
        }
        $state.go('add-collection', { 'action': 'account' });
      };
      $scope.searchUsers = function (text, fromButton) {
        if (timeout_id) {
          clearTimeout(timeout_id);
          timeout_id = 0;
        }
        if (text.length > 2 || fromButton && !sent) {
          sent = 1;
          timeout_id = setTimeout(function () {
            CollSharedService.searchText(text).then(function (data) {
              for (var j in $scope.checked_data) {
                if (!$scope.checked_data[j]) {
                  delete $scope.checked_data[j];
                }
              }
              var ln = data.data.length;
              if (ln) {
                for (var i = 0; i < ln; i++) {
                  $scope.u_list[data.data[i].uid] = data.data[i].name;
                  CollSharedService.users[data.data[i].uid] = data.data[i].name;
                  if ($scope.checked_data[data.data[i].uid]) {
                    continue;
                  }
                  $scope.checked_data[data.data[i].uid] = false;
                }
              }
              $scope.shared.user_list = data.data;
              sent = 0;
            });
          }, 1000);
        }
      };
      if (angular.isUndefined(CollectionService.tmp_collection.shared) && $scope.collection.bid != 'new') {
        CollSharedService.loadData($scope.collection.bid).then(function (data) {
          $scope.shared = data.data.shared_data;
          try {
            var d = data.data.shared_data.can_view;
            for (var i = 0; i < d.length; i++) {
              $scope.u_list[d[i].uid] = d[i].name;
              CollSharedService.users[d[i].uid] = d[i].name;
            }
          } catch (e) {
            console.error(e);
          }
          if (typeof $scope.shared == 'undefined') {
            return;
          }
          setTab($scope.shared.can_view);
        });
      } else {
        var shared = [];
        if (angular.isDefined(CollectionService.tmp_collection.shared)) {
          // p(CollSharedService.users);
          for (var u in CollectionService.tmp_collection.shared.uid) {
            shared.push({
              name: CollSharedService.users[u],
              uid: u
            });
          }
          setTab(shared);
        }
      }  // p(CollSharedService.users);
    }
    function setTab(can_view) {
      if (can_view.length) {
        for (var i = 0; i < can_view.length; i++) {
          $scope.u_list[can_view[i].uid] = can_view[i].name;
          if (can_view[i].uid > 0) {
            $scope.checked_data[can_view[i].uid] = true;
          }
        }
        var index = 0;
        if (can_view) {
          if (can_view[0].uid == 0) {
            index = 0;
            $scope.checked_data = {};
          } else if (i > 1) {
            index = 2;
          } else if (i == 1 && can_view[0].uid == UserService.user.uid) {
            index = 1;
            $scope.checked_data = {};
          } else {
            index = 2;
          }
        }
        $timeout(function () {
          $scope.ionicTabsDelegate.select(index);
        }, 200);
      }
    }
    $scope.checkWhoCanAdd = function (bid) {
      if (angular.isUndefined(bid)) {
        bid = 'new';
      }
      CollSharedService.loadData(bid).then(function (data) {
        $scope.shared = data.data.shared_data;
        if ($scope.shared && $scope.shared.can_add.length) {
          for (var i = 0; i < $scope.shared.can_add.length; i++) {
            $scope.checked_data[$scope.shared.can_add[i].uid] = true;
          }
        }
        if ($scope.shared && $scope.shared.followed.length > 0) {
          $scope.popup = $ionicPopup.show({
            title: 'Who can add clips',
            templateUrl: 'views/popups/inputs/collection-can-add.html',
            scope: $scope,
            buttons: [
              { text: 'Cancel' },
              {
                text: 'Save',
                onTap: function () {
                  var params = {
                      bid: bid,
                      type: 'can_add',
                      uid: {}
                    };
                  params[AccountService.account.uid] = 1;
                  $scope.shared.can_add = [];
                  for (var i in $scope.checked_data) {
                    if ($scope.checked_data[i]) {
                      params.uid[i] = 1;
                      $scope.shared.can_add.push({ 'uid': i });
                    }
                  }
                  CollectionService.tmp_collection.can_add = params;  // CollSharedService.saveShared(params).then(function(data){
                                                                      // });
                }
              }
            ]
          });
        } else {
          ToastService.showMessage('danger', 'You don\'t have followers');
        }
      });
    };
    $scope.title_text = Object.keys($scope.collection).length ? 'Edit collection' : 'Add Collection';
    if ($state.includes('add-collection')) {
      $scope.collection = {};
      CollectionService.tmp_collection = {};
    }
    if (!$scope.collection.name || $scope.collection.name == '') {
      $scope.title_text = 'Add Collection';
    }
    $scope.addCollection = function () {
      if ($state.includes('add-collection')) {
        for (var s in CollectionService.tmp_collection) {
          $scope.collection[s] = CollectionService.tmp_collection[s];
        }
        CollectionService.tmp_collection = $scope.collection;
      }
      if (!CollectionService.tmp_collection.name) {
        ToastService.showMessage('danger', 'Name of Collection is required');
        return;
      }
      if (CollectionService.tmp_collection.description && CollectionService.tmp_collection.description.length > 500) {
        ToastService.showMessage('danger', 'Description should be under 500 symbols');
        return;
      }
      CollectionService.add(CollectionService.tmp_collection).then(function (data) {
        $scope.succ_mess = 'Collection succesfully added';
        if ($state.params.collectionId) {
          CollectionService.editCollectionCallback($scope.collection);
        } else {
          if ($state.params.action != 'account') {
            CollectionService.collectionId = data.data.bid;
            $state.go($state.params.action, { clipId: $state.params.clipId });
          }
          CollectionService.addCollectionCallback($scope.collection);
        }
        HttpService.addNoCache('user_collections');
      }, function (reason) {
        ToastService.showDrupalFormMessage('danger', reason.data);
      });
    };
    $scope.deleteCollection = function (bid) {
      var confirmPopup = $ionicPopup.confirm({
          title: 'Delete Collection',
          cssClass: 'confirm',
          template: 'Are you sure you want to delete this collection?'
        });
      confirmPopup.then(function (res) {
        if (res) {
          CollectionService.delete(bid).then(function (data) {
            ToastService.showMessage('success', 'Collection successfully deleted');
            HttpService.clearCache();
            $state.go('account.collections', { userId: UserService.user.uid });
          }, function (reason) {
            ToastService.showDrupalFormMessage('danger', reason.data);
          });
        }
      });
    }  // CollSharedService
;
  }
]);
angular.module('bazaarr').controller('CollectionCoverCtrl', [
  '$scope',
  '$rootScope',
  '$state',
  '$timeout',
  'collection',
  'FollowService',
  'CollectionService',
  'HttpService',
  'ToastService',
  'ClipsService',
  'ClipService',
  function ($scope, $rootScope, $state, $timeout, collection, FollowService, CollectionService, HttpService, ToastService, ClipsService, ClipService) {
    $scope.collection = CollectionService.collections[$state.params.colId];
    //collection.data[0];
    //CollectionService.getCounters($state.params.colId);
    $scope.openClip = function (clipId) {
      ClipsService.load('collection_clips', false, { bid: $state.params.colId }).then(function (data) {
        ClipsService.prepare(data.data, '', true);
        ClipService.page_list = ClipsService.page_api_url;
        $state.go('clip', { 'clipId': clipId });
      });
    };
    $scope.followCollection = function (bid, type) {
      var send_type = 1 === type ? 0 : 1;
      FollowService.followCollection(bid, send_type).then(function (data) {
        $scope.collection.follow = send_type;
        FollowService.followCollectionCallback(data.data.user_follow);
      });
    };
    $scope.accept_collection = function (coll, type) {
      var bid = coll.bid;
      CollectionService.accept_collection(bid, type).then(function (data) {
        if (type == 0 || type == 3) {
          $state.go('account.collections', { 'userId': $rootScope.user.uid });
        } else {
          $scope.collection.accepted = '1';
        }
        HttpService.clearCache();
        ToastService.showMessage('success', data.data.messages.status[0]);
      });
    };
    $scope.addClipFromCollection = function (collection) {
      CollectionService.add_clip_collection = collection;
      $state.go('add');
    };
    $scope.goEditCollection = function (bid) {
      $state.go('edit-collection', { collectionId: bid });
    };
    $scope.$on('update:collection_titles', function (event, args) {
      if (angular.isDefined(CollectionService.collections[args.bid])) {
        $scope.collection = CollectionService.collections[args.bid];
      }
    });
  }
]);
angular.module('bazaarr').controller('InputCtrl', [
  '$scope',
  '$rootScope',
  '$ionicPopup',
  '$timeout',
  '$cordovaKeyboard',
  'ValidateService',
  'ToastService',
  function ($scope, $rootScope, $ionicPopup, $timeout, $cordovaKeyboard, ValidateService, ToastService) {
    $scope.openPopup = function (type, scope_var, value, title, buttons) {
      $scope.popup = {};
      $scope.popup.model = value;
      $scope.popup.add = {};
      if (angular.isDefined($scope.$parent.$parent.clip) && angular.isDefined($scope.$parent.$parent.clip.category)) {
        $scope.tid = $scope.$parent.$parent.clip.category.tid;
      } else if (angular.isDefined($scope.$parent.$parent.collection)) {
        $scope.tid = $scope.$parent.$parent.collection.tid;
      }
      var default_buttons = type.indexOf('select') === 0 ? [{ text: 'Cancel' }] : [
          { text: 'Cancel' },
          {
            text: 'Save',
            onTap: function (e) {
              if (angular.isDefined($scope.popup.add.validate)) {
                // switch($scope.popup.add.validate){
                //     case 'current_pass':
                //         break;
                // }
                if (angular.isUndefined($scope.popup.add.current_pass) || !$scope.popup.add.current_pass || $scope.popup.add.current_pass == '') {
                  ToastService.showMessage('danger', 'Please set your password!');
                  e.preventDefault();
                  return;
                }
              }
              if (!ValidateService.validate($scope.popup.model, type, title)) {
                e.preventDefault();
                return false;
              }
              p(scope_var);
              scope_var = scope_var.split('.');
              if (typeof scope_var[2] != 'undefined') {
                if (typeof $scope[scope_var[0]][scope_var[1]] == 'undefined') {
                  $scope[scope_var[0]][scope_var[1]] = {};
                }
                $scope[scope_var[0]][scope_var[1]][scope_var[2]] = $scope.popup.model;
              } else {
                $scope[scope_var[0]][scope_var[1]] = $scope.popup.model;
              }
              for (var i in $scope.popup.add) {
                $scope[scope_var[0]][i] = $scope.popup.add[i];
              }
            }
          }
        ];
      if (buttons) {
        default_buttons = buttons;
      }
      $scope.popup.sel = $ionicPopup.show({
        title: title,
        templateUrl: 'views/popups/inputs/' + type + '.html',
        scope: $scope,
        cssClass: type + (type.indexOf('select') === 0 ? ' select ' : ''),
        buttons: default_buttons
      });
      $timeout(function () {
        var popupInput = document.querySelector('.popup-body textarea, .popup-body input');
        if (popupInput) {
          popupInput.focus();
          if ($rootScope.is_app) {
            $cordovaKeyboard.show();
          }
        }
      }, 400);
    };
    $scope.popupSelectClick = function (name, value, title) {
      var scope_var = name.split('.');
      if (typeof value == 'object') {
        $scope[scope_var[0]][scope_var[1] + '_from'] = value[0];
        $scope[scope_var[0]][scope_var[1] + '_to'] = value[1];
        if (title) {
          $scope[scope_var[0]][scope_var[1] + '_title'] = title;
        }
        $scope[scope_var[0]][scope_var[1]] = value;
      } else {
        if (typeof scope_var[2] != 'undefined') {
          if (typeof $scope[scope_var[0]][scope_var[1]] == 'undefined') {
            $scope[scope_var[0]][scope_var[1]] = {};
          }
          $scope[scope_var[0]][scope_var[1]][scope_var[2]] = value;
          if (title) {
            $scope[scope_var[0]][scope_var[1]][scope_var[2] + '_title'] = title;
          }
        } else {
          $scope[scope_var[0]][scope_var[1]] = value;
          if (title) {
            $scope[scope_var[0]][scope_var[1] + '_title'] = title;
          }
        }
      }
      $scope.popup.sel.close();
    };
    $scope.popupCategorySelect = function (value, title) {
      if (angular.isDefined($scope.clip)) {
        $scope.clip.category = {
          tid: value,
          name: title
        };
      }
      if (angular.isDefined($scope.collection)) {
        $scope.collection.tid = value;
        $scope.collection.category_name = title;
      }
      $scope.popup.sel.close();
    };
  }
]);
angular.module('bazaarr').service('ValidateService', [
  'ToastService',
  function (ToastService) {
    this.validate = function (value, type, title) {
      title = title || type;
      if (angular.isDefined(this.validate[type]) && !this.validate[type](value)) {
        ToastService.showMessage('danger', 'Please, enter correct ' + title.toLowerCase());
        return false;
      }
      return true;
    };
    this.validate.number = function (value) {
      var re = /^([\d]+(\.{1}[\d]{1,2})?)$/i;
      if (!re.test(value)) {
        return false;
      }
      return true;
    };
    this.validate.url = function (value) {
      var pattern = new RegExp('^(https?:\\/\\/)?' + '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + '((\\d{1,3}\\.){3}\\d{1,3}))' + '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + '(\\?[;&a-z\\d%_.~+=-]*)?' + '(\\#[-a-z\\d_]*)?$', 'i');
      // fragment locator
      if (!pattern.test(value)) {
        return false;
      }
      return true;
    };
  }
]);
angular.module('bazaarr').service('CollectionService', [
  '$rootScope',
  '$state',
  '$q',
  '$timeout',
  'localStorageService',
  'AccountService',
  'ClipsService',
  'HttpService',
  'ToastService',
  'UserService',
  function ($rootScope, $state, $q, $timeout, localStorageService, AccountService, ClipsService, HttpService, ToastService, UserService) {
    this.collections = [];
    this.collectionId = 0;
    this.tmp_collection = {};
    this.users = {};
    this.add_clip_collection = {};
    this.accept_collection = function (bid, type) {
      HttpService.view_url = 'collection/shared/' + bid;
      HttpService.params = { 'data': { 'type': type } };
      return HttpService.post();
    };
    this.singleLoad = function (bid) {
      if (this.collections[bid]) {
        return $q.when({ 'data': [this.collections[bid]] });
      }
      HttpService.view_url = 'user_collections';
      HttpService.params = { 'bid': bid };
      HttpService.is_auth = false;
      HttpService.cache = false;
      var promise = HttpService.get();
      var that = this;
      promise.then(function (data) {
        that.collections[bid] = data.data[0];
        that.getCounters(bid);
      });
      return promise;
    };
    this.load = function (uid) {
      var cur_uid = AccountService.account_id || UserService.user.uid;
      uid = uid || cur_uid;
      HttpService.view_url = 'user_collections';
      HttpService.params = { 'uid': uid };
      HttpService.is_auth = false;
      return HttpService.get();
    };
    this.load2 = function (uid) {
      var cur_uid = AccountService.account_id || UserService.user.uid;
      uid = uid || cur_uid;
      HttpService.view_url = 'get_user_collections/' + uid;
      // HttpService.params   = {"uid" : uid};
      HttpService.is_auth = false;
      return HttpService.get();
    };
    this.prepare = function (data) {
      var j = 0;
      for (var i in data) {
        if (typeof data[i].accepted != 'undefined') {
          data[i].accepted = parseInt(data[i].accepted);
        }
        // if (!!data[i].imgs === true) {
        //     data[i].imgs_r = ClipsService.applyOrientation(data[i].imgs, "collection");
        //     j++;
        // }
        if (angular.isUndefined(data[i].follow)) {
          data[i].follow = parseInt(data[i].followed);
        }
        if ($rootScope.isMyAccount() && $state.includes('account.following-collections')) {
          data[i].follow = 1;
        }
        if ($rootScope.isMyAccount() && $state.includes('account.collections')) {
          data[i].can_edit = true;
        } else {
          data[i].can_edit = false;
        }
        if (data[i].access_add && data[i].access_add.length > 1) {
          data[i].is_shared = true;
        } else {
          data[i].is_shared = false;
        }
        this.collections[data[i].bid] = data[i];
      }
      return this.applyOrientation(data);
    };
    this.applyOrientation = function (data) {
      var cols = this.getColsNumber();
      return ClipsService.chunk_table(data, cols);
    };
    this.getColsNumber = function () {
      var cols = 3;
      if (window.matchMedia('(orientation: landscape)').matches) {
        cols = 5;
      }
      if (ionic.Platform.isIPad()) {
        cols++;
      }
      return cols;
    };
    this.add = function (collection) {
      var method = 'post';
      HttpService.view_url = 'collection';
      HttpService.params = collection;
      if (collection.bid && collection.bid != 'new') {
        HttpService.view_url += '/' + collection.bid;
        return HttpService.put();
      }
      return HttpService.post();
    };
    this.delete = function (bid) {
      HttpService.view_url = 'collection/' + bid;
      return HttpService.dell();
    };
    this.getCategories = function (vid) {
      HttpService.view_url = 'getCategories';
      HttpService.is_auth = false;
      HttpService.params = {};
      return HttpService.get();
    };
    this.addCollectionCallback = function (collection) {
      ToastService.showMessage('success', 'The collection ' + collection.name + ' is created');
      AccountService.updateCounters('collections_count', 1);
      this.editCollectionCallback(collection);
    };
    this.editCollectionCallback = function (collection) {
      if (!this.collectionId) {
        HttpService.addNoCache('user_collections');
        HttpService.clearCache();
        $state.go('account.collections', { userId: UserService.user.uid });
      }
    };
    this.findCollection = function (bid) {
      var ret = '';
      var session = localStorageService.get('session');
      angular.forEach(session.collections, function (value, key) {
        if (value.bid === bid) {
          ret = value;
        }
      });
      return ret;
    };
    this.revertFollow = function (collections, type) {
      angular.forEach(collections, function (value, key) {
        value.follow = type ? 1 : 0;
      });
      return collections;
    };
    this.updateCollectionField = function (bid, field, value, operation) {
      if (!this.collections[bid] || !this.collections[bid][field]) {
        return false;
      }
      switch (operation) {
      case 'increment':
        this.collections[bid][field] = parseInt(this.collections[bid][field]) + value;
        break;
      case 'update':
        this.collections[bid][field] = value;
        break;
      }
    };
    this.getCounters = function (bid) {
      if (angular.isUndefined(this.collections[bid]) || angular.isDefined(this.collections[bid].count_clips)) {
        return false;
      }
      HttpService.view_url = 'collection-counters/' + bid;
      HttpService.is_auth = false;
      var that = this;
      HttpService.get().then(function (data) {
        angular.extend(that.collections[bid], data.data);
      });
    };
  }
]);
angular.module('bazaarr').service('CollSharedService', [
  'AccountService',
  'ClipsService',
  'HttpService',
  function (AccountService, ClipsService, HttpService) {
    // this.collection = {
    // };
    this.type = {};
    this.users = {};
    this.saveShared = function (params) {
      HttpService.view_url = 'shared/';
      HttpService.params = params;
      return HttpService.post();
    };
    this.loadData = function (bid) {
      HttpService.view_url = 'collection/' + bid;
      HttpService.params = { 'data': 1 };
      HttpService.cache = false;
      return HttpService.get();
    };
    this.searchText = function (text) {
      HttpService.view_url = 'collection/getUsers';
      HttpService.params = { 'text': text };
      HttpService.cache = false;
      return HttpService.post();
    };
  }
]);'use strict';
angular.module('bazaarr').controller('LoginCtrl', [
  '$scope',
  '$rootScope',
  '$state',
  '$cookies',
  '$cordovaPush',
  'UserService',
  'RegistrationService',
  'DeviceAdapterService',
  'CollectionService',
  'ToastService',
  'HttpService',
  function ($scope, $rootScope, $state, $cookies, $cordovaPush, UserService, RegistrationService, DeviceAdapterService, CollectionService, ToastService, HttpService) {
    if (UserService.is_login) {
      $state.go('account.collections', { 'userId': UserService.user.uid });
      return false;
    }
    $scope.getToken = function () {
      UserService.getToken().then(function (data) {
        UserService.token = data.data;
        $cookies['CSRF-TOKEN'] = data.data;
        //$scope.isConnect();
        $state.go('user.collections');
      });
    };
    $scope.isConnect = function () {
      UserService.isConnect().then(function (data) {
        p(data.data.user);
      });
    };
    $scope.signIn = function (user, type) {
      if (UserService.is_login) {
        $state.go('account.collections', { 'userId': UserService.user.uid });
        return false;
      }
      //UserService.clearCookies();
      /*if (DeviceAdapterService.is_ready && ionic.Platform.isAndroid()) {
            var config = DeviceAdapterService.getAndroidPushConfig();
            $cordovaPush.register(config).then(function(result) {
                user.device_id = result;
                $scope.login(user, type);
            }, function(err) {
                ToastService.showMessage("danger", "Device registration error: " + err);
            });
        }
        else {*/
      user.device_id = '';
      $scope.login(user, type);  //}
    };
    $scope.login = function (user, type) {
      UserService.signIn(user, type).then(function (data) {
        CollectionService.user_collections = data.data.collections;
        HttpService.clearCache();
        UserService.loginCallback(data.data);
      }, function (reason) {
        UserService.clearUser();
        ToastService.showMessage('danger', reason.data);
      });
    };
    $scope.create = function (user) {
      RegistrationService.add(user).then(function (data) {
        var login = {};
        login.username = user.name;
        login.password = user.pass;
        $scope.signIn(login);
      }, function (reason) {
        ToastService.showDrupalFormMessage('danger', reason.data);
      });
    };
    var domain = window.location.host.split('.').pop(), appId = '';
    switch (domain) {
    case 'dev':
    case 'org':
      appId = 430153587174464;
      break;
    case 'net':
      appId = 430153653841124;
      break;
    case 'com':
      appId = 302850933231229;
      break;
    }
    openFB.init({ appId: appId });
    $scope.fbLogin = function () {
      openFB.login(function (response) {
        if (response.status === 'connected') {
          openFB.api({
            path: '/me',
            success: function (data) {
              data.is_fb = true;
              $scope.signIn(data, 'social');
            }
          });
          p('Facebook login succeeded, got access token: ' + response.authResponse.token);
        } else {
          p('Facebook login failed: ' + response.error);
        }
      }, { scope: 'email,read_stream,user_about_me,user_birthday,user_friends,user_hometown,user_website,publish_actions' });  //'email,read_stream,publish_stream'
    };
    /* denysovpavlo@gmail.com
     * 548F12cab
     */
    //$scope.getToken();
    $scope.user = {};  /*$scope.user.username = "admin";
    $scope.user.password = "abcd1234";*/
                       //$scope.signIn(user);
  }
]);
angular.module('bazaarr').controller('ForgotPasswordCtrl', [
  '$scope',
  'ForgotPasswordService',
  'ToastService',
  function ($scope, ForgotPasswordService, ToastService) {
    $scope.forgot = {};
    $scope.forgot.name = '';
    $scope.sendPassword = function (name) {
      ForgotPasswordService.sendPassword(name).then(function (data) {
        $scope.forgot.name = '';
        ToastService.showMessage('success', 'Further instructions have been sent to your e-mail address');
      }, function (reason) {
        ToastService.showMessage('danger', reason.data);
      });
    };
  }
]);
angular.module('bazaarr').controller('ResetPasswordCtrl', [
  '$state',
  'ForgotPasswordService',
  function ($state, ForgotPasswordService) {
    var hash_data = {};
    hash_data.uid = $state.params.userId;
    hash_data.timestamp = $state.params.timestamp;
    hash_data.hashed_pass = $state.params.hash;
    ForgotPasswordService.hashLogin(hash_data);
  }
]);
angular.module('bazaarr').controller('LoginLinkCtrl', [
  'LoginService',
  function (LoginService) {
    LoginService.remoteLogin();
  }
]);
angular.module('bazaarr').service('LoginService', [
  '$state',
  '$rootScope',
  'HttpService',
  'UserService',
  'ToastService',
  'CollectionService',
  function ($state, $rootScope, HttpService, UserService, ToastService, CollectionService) {
    this.remoteLogin = function () {
      if (angular.isDefined(UserService.user.uid) && UserService.user.uid) {
        this.remoteLoginCallback();
        return true;
      }
      HttpService.view_url = 'remote-login';
      HttpService.is_auth = false;
      HttpService.params = { 'hash': $state.params.hashLogin };
      var promise = HttpService.post();
      var that = this;
      promise.then(function (data) {
        CollectionService.user_collections = data.data.collections;
        UserService.store(data.data);
        that.remoteLoginCallback();
      }, function (reason) {
        ToastService.showMessage('danger', reason.data);
        $state.go('login');
      });
    };
    this.remoteLoginCallback = function () {
      var event = $state.params.event.split('_');
      switch (event[0]) {
      case 'collections':
        $state.go('account.collections', { 'userId': UserService.user.uid }).then(function () {
          p(event[1]);
        });
        break;
      case 'like':
        $state.go('clip', { 'clipId': event[1] }).then(function () {
          $rootScope.$broadcast('clip:like');
        });
        break;
      }
    }  //http://bazaarr.dev/l/OtOJ0UobXBk_?destination=collections/127/accept
;
  }
]);
angular.module('bazaarr').service('ForgotPasswordService', [
  '$state',
  '$q',
  'HttpService',
  'UserService',
  'CollectionService',
  'ToastService',
  function ($state, $q, HttpService, UserService, CollectionService, ToastService) {
    this.sendPassword = function (name) {
      if (!name) {
        return $q.reject({ 'data': 'Please enter your username or e-mail address' });
      }
      HttpService.view_url = 'user/request_new_password';
      HttpService.is_auth = false;
      HttpService.params = { 'name': name };
      return HttpService.post();
    };
    this.hashLogin = function (hash_data) {
      if (UserService.is_login) {
        ToastService.showMessage('danger', 'You are already logged in');
        $state.go('account.collections', { 'userId': UserService.user.id });
        return false;
      }
      HttpService.view_url = 'hash-login';
      HttpService.is_auth = false;
      HttpService.params = hash_data;
      HttpService.post().then(function (data) {
        ToastService.showMessage('success', 'You have just used your one-time login link. It is no longer necessary to use this link to log in. \n                Please change your password.');
        CollectionService.user_collections = data.data.collections;
        data.data.user.forgot_password = 1;
        UserService.loginCallback(data.data);
      }, function (reason) {
        ToastService.showMessage('danger', reason.data);
        $state.go('forgot-password');
      });
    };
  }
]);var p = console.log.bind(console);
'use strict';
angular.module('bazaarr').controller('MainCtrl', [
  '$scope',
  '$state',
  '$rootScope',
  '$ionicPopover',
  '$ionicPopup',
  'MenuService',
  'UserService',
  'ToastService',
  'ConfigService',
  'HttpService',
  function ($scope, $state, $rootScope, $ionicPopover, $ionicPopup, MenuService, UserService, ToastService, ConfigService, HttpService) {
    //$scope.menus = MenuService.get();
    //$scope.title = MenuService.getTitle();
    $scope.setActive = function () {
      MenuService.setActive();
    };
    $scope.swipeLeft = function () {
      MenuService.nextMenu();
    };
    $scope.swipeRight = function () {
      MenuService.prevMenu();
    };
    $scope.isLogin = function () {
      var is_login = false;
      if (UserService.is_login) {
        //$scope.user = UserService.user;
        is_login = true;
      }
      return is_login;
    };
    $scope.logout = function () {
      UserService.logout().then(function (data) {
        HttpService.clearCache();
        UserService.clearUser();
        $state.go('login');
      }, function (reason) {
        HttpService.clearCache();
        UserService.clearUser();
        $state.go('login');
      });
    };
    $scope.addClip = function () {
      $state.go('add');
    };
    $scope.goHome = function () {
      $state.go('recent');
    };
    $scope.isSearch = function () {
      return SearchService.isSearch();
    };
    $scope.isCurrentAccount = function () {
      return $rootScope.isMyAccount() && $rootScope.isUserMenu();
    };
    $ionicPopover.fromTemplateUrl('views/menu/userAccount.html', { scope: $scope }).then(function (popover) {
      $scope.userAccountPopover = popover;
    });
    $ionicPopover.fromTemplateUrl('views/menu/myAccount.html', { scope: $scope }).then(function (popover) {
      $scope.myAccountPopover = popover;
    });
    $scope.openPopover = function ($event) {
      if ($scope.user.uid != $state.params['userId']) {
        $scope.userAccountPopover.show($event);
      } else {
        $scope.myAccountPopover.show($event);
      }
    };
    $scope.closePopover = function () {
      if ($scope.myAccountPopover) {
        $scope.myAccountPopover.hide();
      }
      if ($scope.userAccountPopover) {
        $scope.userAccountPopover.hide();
      }
    };
    $scope.popoverLogout = function ($event) {
      this.closePopover();
      this.logout();
    };
    $scope.goToEditProfile = function ($event) {
      this.closePopover();
      $state.go('edit_profile');
    };
    $scope.goToEditAccount = function ($event) {
      this.closePopover();
      $state.go('edit_account');
    };
    $scope.goToAboutAccount = function ($event) {
      this.closePopover();
      $state.go('about-bazaarr');
    };
    $scope.goToAboutSupport = function ($event) {
      this.closePopover();
      $state.go('support');
    };
    $scope.goUserMenu = function (path, params) {
      this.closePopover();
      $state.go(path, params);
    };
    $scope.goLogin = function () {
      ToastService.showMessage('danger', 'Please sign in to continue');
      $state.go('login');
    };
    $scope.selectServer = function () {
      $scope.server_popup = $ionicPopup.show({
        title: 'Select server',
        templateUrl: 'views/popups/select_server.html',
        scope: $scope,
        buttons: [{ text: 'Cancel' }]
      });
    };
    $scope.setServer = function (url) {
      HttpService.clearCache();
      ConfigService.setUrl(url);
      $scope.server_popup.close();
      window.location.reload();
    };
    $scope.checkBookmarkBar = function () {
      return !!window.localStorage['isBookmarkHidden'];
    };
    $scope.hideBookmarkBar = function () {
      window.localStorage.setItem('isBookmarkHidden', true);
    };
    $scope.resetInstructions = function () {
      window.localStorage.removeItem('isBookmarkHidden');
    };
    $scope.isAndroid = function () {
      return ionic.Platform.isAndroid();
    };
    $scope.isIOS = function () {
      return ionic.Platform.isIOS();
    };
  }
]);
angular.module('bazaarr').service('ArrayService', function () {
  this.dropKeys = function (arr) {
    return arr.filter(function () {
      return true;
    });
  };
  this.url_domain = function (link) {
    var a = document.createElement('a');
    a.href = link;
    return a.hostname;
  };
});
angular.module('bazaarr').service('MenuService', [
  '$ionicScrollDelegate',
  '$stateParams',
  '$location',
  '$ionicTabsDelegate',
  function ($ionicScrollDelegate, $stateParams, $location, $ionicTabsDelegate) {
    this.active_id = 0, this.get = function () {
      return [
        {
          'id': '0',
          'name': 'Recent',
          'url': 'recent',
          'api': {
            'url': 'views/clip_pages',
            'display_id': 'page_3'
          }
        },
        {
          'id': '1',
          'name': 'Following',
          'url': 'following',
          'api': {
            'url': 'views/clip_pages',
            'display_id': 'page_4'
          }
        },
        {
          'id': '2',
          'name': 'Shop',
          'url': 'shop',
          'api': {
            'url': 'views/clip_pages',
            'display_id': 'page_2'
          }
        },
        {
          'id': '3',
          'name': 'Search',
          'url': 'search'
        },
        {
          'id': '4',
          'name': 'My Account',
          'url': 'collections'
        },
        {
          'id': '5',
          'name': 'Clips',
          'url': 'clips',
          'api': {
            'url': 'views/clip_pages',
            'display_id': 'page_7'
          }
        },
        {
          'id': '6',
          'name': 'Likes',
          'url': 'likes',
          'api': {
            'url': 'views/clip_pages',
            'display_id': 'page_8'
          }
        }
      ];
    }, this.setActiveMenuCss = function (index) {
      var $menus = document.body.querySelectorAll('.main-menu a');
      for (var i = 0; i < $menus.length; i++) {
        $menus[i].className = '';
      }
      document.getElementById('main-menu_' + index).className = 'active';
    }, this.setActive = function (active_id) {
      this.active_id = active_id || $ionicTabsDelegate.selectedIndex() - 1;
    }, this.getTitle = function () {
      var title = 'Recent';
      if ($stateParams) {
        var url = '';
        if ($stateParams.contentTitle) {
          title = $stateParams.contentTitle;
          url = 'content/' + title;
        } else if ($stateParams.clipsPage) {
          title = $stateParams.clipsPage;
          url = 'clips/' + title;
        } else {
          return title;
        }  //this.setActive(url);
      }
      return title;
    }, this.getActiveMenu = function (url) {
      url = url || $location.url();
      url = url.replace(/\/:(.*)/, '');
      var menus = this.get();
      for (var i = 0; i < menus.length; i++) {
        if ('/' + menus[i].url == url) {
          return menus[i];
        }
      }
      return {};  //menus[this.active_id];
    }, this.nextMenu = function () {
      var menus = this.get();
      if (this.active_id >= menus.length) {
        return false;
      }
      $location.url(menus[this.active_id + 1].url);
      this.setActive(this.active_id + 1);  //menus[this.active_id + 1].url
    }, this.prevMenu = function () {
      var menus = this.get();
      if (this.active_id <= 0) {
        return false;
      }
      $location.url(menus[this.active_id - 1].url);
      this.setActive(this.active_id - 1);  //menus[this.active_id - 1].url
    };
  }
]);'use strict';
angular.module('bazaarr').controller('SearchCtrl', [
  '$scope',
  '$rootScope',
  '$state',
  '$ionicTabsDelegate',
  '$cordovaKeyboard',
  'SearchService',
  'ToastService',
  'CollectionService',
  'ClipsService',
  function ($scope, $rootScope, $state, $ionicTabsDelegate, $cordovaKeyboard, SearchService, ToastService, CollectionService, ClipsService) {
    $scope.resetSearchResults = function (is_manual) {
      $scope.search = {
        search_api_views_fulltext: '',
        price: ',',
        price_title: 'All',
        field_category: 'All',
        price_type: 0,
        price_value: 0,
        type: 0,
        search_api_clips_types: 0,
        sort_order: 'DESC',
        sort_order_title: 'Descending',
        sort_by: 'created',
        sort_by_title: 'Date'
      };
      $scope.searchColors = [
        {
          'r': 1,
          'g': 1,
          'b': 255
        },
        {
          'r': 1,
          'g': 132,
          'b': 200
        },
        {
          'r': 25,
          'g': 174,
          'b': 255
        },
        {
          'r': 114,
          'g': 47,
          'b': 69
        },
        {
          'r': 167,
          'g': 38,
          'b': 94
        },
        {
          'r': 139,
          'g': 1,
          'b': 1
        },
        {
          'r': 181,
          'g': 1,
          'b': 1
        },
        {
          'r': 220,
          'g': 1,
          'b': 1
        },
        {
          'r': 255,
          'g': 127,
          'b': 80
        },
        {
          'r': 255,
          'g': 102,
          'b': 1
        },
        {
          'r': 158,
          'g': 111,
          'b': 72
        },
        {
          'r': 184,
          'g': 129,
          'b': 1
        },
        {
          'r': 201,
          'g': 179,
          'b': 152
        },
        {
          'r': 39,
          'g': 35,
          'b': 88
        },
        {
          'r': 255,
          'g': 153,
          'b': 1
        },
        {
          'r': 255,
          'g': 192,
          'b': 34
        },
        {
          'r': 255,
          'g': 192,
          'b': 203
        },
        {
          'r': 255,
          'g': 255,
          'b': 62
        },
        {
          'r': 128,
          'g': 77,
          'b': 1
        },
        {
          'r': 154,
          'g': 222,
          'b': 1
        },
        {
          'r': 1,
          'g': 145,
          'b': 1
        },
        {
          'r': 241,
          'g': 202,
          'b': 255
        },
        {
          'r': 186,
          'g': 1,
          'b': 255
        },
        {
          'r': 204,
          'g': 204,
          'b': 204
        },
        {
          'r': 1,
          'g': 1,
          'b': 1
        },
        {
          'r': 255,
          'g': 255,
          'b': 255
        }
      ];
      $scope.users = [];
      $scope.collections = [];
      if (is_manual) {
        document.getElementsByClassName('search-top-input')[0].value = '';
      }
    };
    $scope.resetSearchResults();
    $scope.users = [];
    $scope.collections = [];
    CollectionService.getCategories(2).then(function (data) {
      $scope.categories = data.data;
    });
    if ($state.params && $state.params.query) {
      $scope.search.search_api_views_fulltext = $state.params.query;
      if ($state.current.name == 'search-users') {
        SearchService.userSearch($scope.search.search_api_views_fulltext).then(function (data) {
          $scope.users = data.data;
        });
      } else if ($state.current.name == 'search-collections') {
        SearchService.collectionSearch($scope.search.search_api_views_fulltext).then(function (data) {
          $scope.collections = data.data;
        });
      } else if ($state.current.name == 'search-clips') {
      } else if ($state.current.name == 'search') {
        SearchService.userSearch($scope.search.search_api_views_fulltext, 5).then(function (data) {
          $scope.users = data.data;
        });
        SearchService.collectionSearch($scope.search.search_api_views_fulltext, 5).then(function (data) {
          $scope.collections = data.data;
        });  // Add clips search
      }
    }
    /*
     * Function to hide keyboard on the IOS 8 if blur() doesn't work
     */
    function unfocusSearch() {
      document.activeElement.blur();
      if ($rootScope.is_app && ionic.Platform.isIOS()) {
        $cordovaKeyboard.close();
      }
    }
    $scope.goSearchResults = function (search) {
      if ($scope.search.search_api_views_fulltext && $scope.search.search_api_views_fulltext.length >= 1) {
        if ($state.current.name == 'search-users') {
          SearchService.userSearch(search.search_api_views_fulltext).then(function (data) {
            $scope.users = data.data;
          });
        } else if ($state.current.name == 'search-collections') {
          SearchService.collectionSearch(search.search_api_views_fulltext).then(function (data) {
            $scope.collections = data.data;
          });
        } else if ($state.current.name == 'search') {
          SearchService.userSearch(search.search_api_views_fulltext, 5).then(function (data) {
            $scope.users = data.data;
          });
          SearchService.collectionSearch(search.search_api_views_fulltext, 5).then(function (data) {
            $scope.collections = data.data;
          });
          $scope.is_load_more = false;
          SearchService.params = search;
          SearchService.load().then(function (data) {
            $scope.clips = data.data.length ? ClipsService.prepare(data.data, '', true) : {};
          });
        }
      } else {
        ToastService.showMessage('danger', 'Please enter 1 or more symbols');
      }  /*
        switch($ionicTabsDelegate.selectedIndex()){
            // clip search
            case 0:
                if (search.price) {
                    if(typeof search.price == 'object') {
                        var price_range = search.price;
                    } else {
                        var price_range = search.price.split(",");
                    }
                    search.price_value      = parseFloat(price_range[0]);
                    search.price_value_1    = parseFloat(price_range[1]);
                    if(isNaN(search.price_value)){
                        search.price_value = '';
                    }
                    if(isNaN(search.price_value_1)){
                        search.price_value_1 = '';
                    }
                }

                SearchService.page = 0;
                for(var i in search){
                    SearchService.params[i] = search[i];
                }

                SearchService.params.search_api_views_fulltext = encodeURIComponent(SearchService.params.search_api_views_fulltext);
                $state.go("search-results", {"hash" : new Date().getTime()}).then(function() {
                    unfocusSearch();
                });
            break;
            // user search
            case 2:
                if(search.search_api_views_fulltext && search.search_api_views_fulltext.length >= 1){
                    SearchService.userSearch(search.search_api_views_fulltext).then(function(data){
                        $scope.users = data.data;
                        if(!$scope.users.length){
                            ToastService.showMessage("danger", "We did not find any results for "+search.search_api_views_fulltext+", please type a new query.");
                        }
                        unfocusSearch();
                    });
                } else {
                    ToastService.showMessage("danger", "Please enter 1 or more symbols to search users!");
                }
            break;
            // collection search
            case 1:
                if(search.search_api_views_fulltext && search.search_api_views_fulltext.length >= 1){
                    SearchService.collectionSearch(search.search_api_views_fulltext).then(function(data){
                        $scope.collections = data.data;
                        if(!$scope.collections.length){
                            ToastService.showMessage("danger", "We did not find any results for "+search.search_api_views_fulltext+", please type a new query.");
                        }
                        unfocusSearch();
                    });
                } else {
                    ToastService.showMessage("danger", "Please enter 1 or more symbols to search collections!");
                }
            break;
        }
        */
    };
    $scope.goSearch = function () {
      $state.go('search');
    };
    $scope.isSearch = function () {
      return SearchService.isSearch();
    };
    $scope.selectColor = function (r, g, b) {
      //if(r && g && b) {
      if ($scope.search.color_r == r && $scope.search.color_g == g && $scope.search.color_b == b) {
        $scope.search.color_r = '';
        $scope.search.color_g = '';
        $scope.search.color_b = '';
      } else {
        $scope.search.color_r = r;
        $scope.search.color_g = g;
        $scope.search.color_b = b;
      }  //}
    };
    $scope.checkColor = function (r, g, b) {
      if ($scope.search.color_r == r && $scope.search.color_g == g && $scope.search.color_b == b) {
        return 'active';
      }
    };
    $scope.selectType = function (type, from, to) {
      // switch(type){
      //     case 0:
      //     case 1:
      //         if($scope.search.sort_by == 'price_value'){
      //             $scope.search.sort_by           = 'created';
      //             $scope.search.sort_by_title     = 'Date';
      //             $scope.search.sort_order        = 'DESC';
      //             $scope.search.sort_order_title  = 'Descending';
      //         }
      //         break;
      //     case 2:
      //         if($scope.search.sort_by == 'created'){
      //             $scope.search.sort_by           = 'price_value';
      //             $scope.search.sort_by_title     = 'Price';
      //             $scope.search.sort_order        = 'ASC';
      //             $scope.search.sort_order_title  = 'Ascending';
      //         }
      //         break;
      // }
      $scope.search.price = from + ',' + to;
      $scope.search.price_value = from;
      if (type == 1) {
        if ($scope.search.price_type != type) {
          $scope.search.lastSort = $scope.search.sort_by;
        }
        $scope.search.sort_by = 'created';
        $scope.search.sort_by_title = 'Date';  // $scope.search.sort_order        = 'DESC';
                                               // $scope.search.sort_order_title  = 'Descending';
      } else {
        if ($scope.search.lastSort && $scope.search.lastSort == 'price_value') {
          $scope.search.sort_by = 'price_value';
          $scope.search.sort_by_title = 'Price';  // $scope.search.sort_order        = 'ASC';
                                                  // $scope.search.sort_order_title  = 'Ascending';
        }
      }
      if (type == 2 && $scope.search.price_value_1 > 0) {
        $scope.search.price_type = type;
      } else {
        $scope.search.price_value_1 = to;
        $scope.search.price_type = type;
      }
    };
    $scope.selectSeachType = function (type) {
      $scope.search.type = type;
    };
    $scope.searchInputKeyPress = function (e, search) {
      // console.log(e);
      if (e.keyCode == 13) {
        $scope.goSearchResults(search);
      }
    };
  }
]);
angular.module('bazaarr').service('SearchService', [
  '$state',
  '$ionicLoading',
  'UserService',
  'server_url',
  'HttpService',
  'ClipsService',
  function ($state, $ionicLoading, UserService, server_url, HttpService, ClipsService) {
    this.params = {};
    this.page = 0;
    this.loadMore = function () {
      ClipsService.is_more = true;
      this.page += 1;
      return this.load();
    };
    this.collectionSearch = function (search, limit) {
      HttpService.view_url = 'collections-search';
      HttpService.is_auth = false;
      HttpService.params = { name: search };
      if (limit) {
        HttpService.params.limit = limit;
      }
      return HttpService.get();
    };
    this.userSearch = function (search, limit) {
      HttpService.view_url = 'user-search';
      HttpService.is_auth = false;
      HttpService.params = { name: search };
      if (limit) {
        HttpService.params.limit = limit;
      }
      return HttpService.get();
    };
    this.load = function () {
      HttpService.view_url = 'views/solr_clip_search';
      HttpService.page = this.page;
      HttpService.params = this.params;
      HttpService.cache = false;
      HttpService.is_auth = false;
      if (!HttpService.page) {
        ClipsService.newArr['search'] = [];
        ClipsService.newArrSize['search'] = [];
        ClipsService.is_more = false;
        ClipsService.page_api_url = 'search';
        ClipsService.is_user_page = false;
        $ionicLoading.show();
      }
      var ret = HttpService.get();
      ret.then(function (data) {
        $ionicLoading.hide();
      });
      return ret;  //return HttpService.get();
    };
    this.getTitle = function () {
      if (!Object.keys(this.params).length || !!this.params.search_api_views_fulltext === false || !this.params.search_api_views_fulltext) {
        return '';
      }
      return decodeURIComponent(this.params.search_api_views_fulltext);
    }, this.isSearch = function () {
      if ($state) {
        return $state.includes('search-results');
      }
      if (Object.keys(this.params).length) {
        return true;
      }
      return false;
    };
  }
]);'use strict';
angular.module('bazaarr').controller('ClaimCtrl', [
  '$scope',
  '$rootScope',
  '$state',
  '$ionicPopup',
  'ClaimService',
  'ToastService',
  'DeviceAdapterService',
  function ($scope, $rootScope, $state, $ionicPopup, ClaimService, ToastService, DeviceAdapterService) {
    $scope.users = [];
    $scope.search = '';
    $scope.is_ready = DeviceAdapterService.is_ready;
    $scope.file = null;
    $scope.params = {
      claim: $state.params.userId,
      firstname: '',
      lastname: '',
      email: '',
      claim_image: 0,
      app: 1
    };
    $scope.goToClaim = function (uid, claim) {
      $state.go('claim-user', { 'userId': uid });
      return;
      if (!claim) {
        $state.go('claim-user', { 'userId': uid });
        return;
      }
      $state.go('login');
    };
    $scope.searchInputKeyPress = function (e, search) {
      if (e.keyCode == 13) {
        $scope.goSearchResults(search);
      }
    };
    $scope.goSearchResults = function (search) {
      ClaimService.load_users(search).then(function (data) {
        $scope.users = data.data;
      });
    };
    $scope.validateClaim = function (params) {
      if (params.firstname == '') {
        ToastService.showMessage('danger', 'Field Firstname is required!');
        return false;
      }
      if (params.lastname == '') {
        ToastService.showMessage('danger', 'Field Lastname is required!');
        return false;
      }
      if (params.email == '') {
        ToastService.showMessage('danger', 'Field Email is required!');
        return false;
      }
      return true;
    };
    $scope.submitClaim = function (params, claim_image) {
      if (!$scope.validateClaim(params)) {
        return false;
      }
      params.app = claim_image;
      ClaimService.claim(params).then(function (data) {
        ToastService.showMessage('success', data.data.message);
        $state.go('account.collections', { userId: params.claim });
      }, function (reason) {
        ToastService.showDrupalFormMessage('danger', reason.data);
      });
    };
    $scope.changedFile = function (element) {
      $scope.$apply(function ($scope) {
        var f = element.files[0], FR = new FileReader();
        FR.onload = function (e) {
          $scope.file = e.target.result;
        };
        FR.readAsDataURL(f);
      });
    };
    $scope.openPhotoSourcePopup = function () {
      $scope.photo_source_popup = $ionicPopup.show({
        title: 'Select source',
        templateUrl: 'views/popups/photo_source.html',
        scope: $scope
      });
    };
  }
]);
angular.module('bazaarr').controller('ContactCtrl', [
  '$scope',
  '$state',
  'AccountService',
  'HttpService',
  'ToastService',
  function ($scope, $state, AccountService, HttpService, ToastService) {
    $scope.contact = { uid: $scope.account.uid };
    $scope.sendMessage = function (contact) {
      AccountService.contactAccount(contact).then(function (data) {
        $scope.contact = { uid: $scope.account.uid };
        ToastService.showMessage('success', 'Message sent successfully!');
      }, function (reason) {
        ToastService.showDrupalFormMessage('danger', reason.data);
      });
    };
  }
]);
angular.module('bazaarr').controller('AboutCtrl', [
  '$scope',
  '$timeout',
  '$state',
  '$sce',
  '$ionicPlatform',
  'AboutService',
  'ConfigService',
  function ($scope, $timeout, $state, $sce, $ionicPlatform, AboutService, ConfigService) {
    if ($state.includes('support')) {
    } else {
      $scope.about_data = [];
      AboutService.loadVar('about_pages_data').then(function (data) {
        if (data.data.length) {
          for (var i = 0; i < data.data.length; i++) {
            $scope.about_data.push({
              title: data.data[i].form.item_name,
              body: $sce.trustAsHtml(data.data[i].form.item_body.replace(/<a[^>]+>/gm, ''))
            });
          }
          ;
        }
      });
    }
    if ($scope.closePopover) {
      $scope.closePopover();
    }
  }
]);
angular.module('bazaarr').directive('script', function () {
  return {
    restrict: 'E',
    scope: false,
    link: function (scope, elem, attr) {
      if (attr.type === 'text/javascript-lazy') {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        var src = elem.attr('src');
        if (src !== undefined) {
          s.src = src;
        } else {
          var code = elem.text();
          s.text = code;
        }
        document.head.appendChild(s);
        elem.remove();
      }
    }
  };
});
angular.module('bazaarr').controller('ProfileCtrl', [
  '$scope',
  '$state',
  '$ionicPopup',
  '$ionicLoading',
  '$cordovaCamera',
  'UserService',
  'AccountService',
  'DeviceAdapterService',
  'ToastService',
  'StateService',
  'HttpService',
  'userPicture',
  function ($scope, $state, $ionicPopup, $ionicLoading, $cordovaCamera, UserService, AccountService, DeviceAdapterService, ToastService, StateService, HttpService, userPicture) {
    if (!UserService.is_login) {
      $state.go('login');
      return false;
    }
    $scope.account = angular.copy(UserService.user);
    $scope.image_src = $scope.account.picture;
    $scope.file = {};
    $scope.is_ready = DeviceAdapterService.is_ready;
    var deff_pass = {
        confirmPassword: '',
        password: '',
        mess: null,
        is_valid: false
      };
    $scope.pass = angular.copy(deff_pass);
    $scope.checkPass = function (pass) {
      $scope.pass.is_valid = false;
      if (!pass.password) {
        $scope.pass.mess = '';
        //Please set your password
        return '';
      }
      if (pass.password.length < 6) {
        $scope.pass.mess = 'Password is too short';
        return 'error';
      }
      if (!pass.confirmPassword) {
        $scope.pass.mess = 'Please fill Confirm Password field';
        return 'error';
      }
      if (pass.password != pass.confirmPassword) {
        $scope.pass.mess = 'Passwords do not match';
        return 'error';
      }
      if (!pass.current_password && !UserService.user.forgot_password) {
        $scope.pass.mess = 'Enter current password';
        return 'error';
      }
      $scope.pass.mess = null;
      $scope.pass.is_valid = true;
      return 'good';
    };
    $scope.passwordChange = function () {
      $scope.popup = $ionicPopup.show({
        title: 'Change Password',
        templateUrl: 'views/popups/inputs/password.html',
        scope: $scope,
        cssClass: 'password',
        buttons: [
          {
            text: 'Confirm',
            onTap: function (e) {
              if ($scope.pass.is_valid) {
                $scope.account.pass = $scope.pass.password;
                $scope.account.current_password = $scope.pass.current_password;
              } else {
                e.preventDefault();
              }
            }
          },
          {
            text: 'Cancel',
            onTap: function (e) {
              $scope.pass = angular.copy(deff_pass);
            }
          }
        ]
      });
    };
    $scope.openPhotoPopup = function () {
      userPicture.imgPopup($scope);
    };
    $scope.closeImagePopup = function () {
      userPicture.closeImagePopup($scope);
    };
    $scope.saveAccount = function (account, file) {
      if (UserService.user.forgot_password && $scope.pass.password.length == 0) {
        ToastService.showMessage('danger', 'Please set your password!');
        return;
      }
      $scope.account.forgot_password = 0;
      $ionicLoading.show();
      saveAccount(account);
    };
    function saveAccount(account, file) {
      AccountService.saveAccount(account, file).then(function (data) {
        //$scope.suc_mess = "Profile saved successfully!";
        ToastService.showMessage('success', 'Profile saved successfully!');
        if (!angular.isUndefined(file) && file.fid) {
          account.picture = file.url;
          HttpService.clearCache();
        }
        delete account.forgot_password;
        delete account.pass_reset_token;
        delete account.pass;
        UserService.setUser(account);
        if (AccountService.account.uid == UserService.user.uid) {
          AccountService.account = account;
        }
        StateService.go('account.collections', { 'userId': account.uid }, 'profile:update');
        $ionicLoading.hide();
        $scope.pass = angular.copy(deff_pass);
      }, function (reason) {
        $ionicLoading.hide();
        ToastService.showDrupalFormMessage('danger', reason.data);
      });
    }
    $scope.openPhotoSourcePopup = function () {
      userPicture.openPhotoSourcePopup($scope, DeviceAdapterService.is_ready);
    };
    $scope.changedFile = function (element) {
      userPicture.changedFile(element, $scope);
    };
    $scope.addPhoto = function (type) {
      userPicture.addPhoto(type, $scope, DeviceAdapterService);
    };
  }
]);
angular.module('bazaarr').controller('UserCtrl', [
  '$scope',
  '$rootScope',
  'AccountService',
  'FollowService',
  'ToastService',
  'userPicture',
  'DeviceAdapterService',
  function ($scope, $rootScope, AccountService, FollowService, ToastService, userPicture, DeviceAdapterService) {
    /*if (!UserService.is_login) {
        $state.go('login');
        return false;
    }*/
    $scope.account = AccountService.account;
    //AccountService.account = account.data;//!!account.data === true ? account.data : account;
    $scope.$on('profile:update', function (event) {
      //p(AccountService.account);
      $scope.account = AccountService.account;
    });
    $scope.followUser = function (is_follow) {
      var type = 1 == is_follow ? 0 : 1;
      FollowService.followUser(AccountService.getAccountId(), type).then(function (data) {
        $scope.account.is_follow = type;
        FollowService.followElseUserCallback(type);
        if (data.data.message) {
          ToastService.showMessage('success', data.data.message);
        }  // p(FollowService.colls);
           /*if(!data.data.user_follow){
                for(var t in FollowService.colls){
                    for(var i=0;i<FollowService.colls[t].length;i++){
                        for(var j=0;j<FollowService.colls[t][i].length;j++){
                            FollowService.colls[t][i][j].followed   = 0;
                            FollowService.colls[t][i][j].follow     = 0;
                        }
                    }
                }
            }*/
           //AccountService.updateCounts(); //UserService.updateCounts('following_count', type);
      });
    };
    /*$scope.backAccount = function() {

        var history = $ionicHistory.viewHistory();

        if (history.backView && history.backView.stateName.indexOf("account") === 0 && $rootScope.backState.length) {
            var prev_account = $rootScope.backState.pop();
            $rootScope.backEvent = true;
            $state.go(prev_account.state, prev_account.params);
        }
        else {
            $rootScope.back();
        }
    }*/
    $scope.openPhotoPopup = function () {
      userPicture.imgPopup($scope);
    };
    $scope.openPhotoSourcePopup = function () {
      userPicture.openPhotoSourcePopup($scope, DeviceAdapterService.is_ready);
    };
    $scope.changedFile = function (element) {
      userPicture.changedFile(element, $scope);
    };
    $scope.closeImagePopup = function () {
      userPicture.closeImagePopup($scope);
    };
    $scope.addPhoto = function (type) {
      userPicture.addPhoto(type, $scope, DeviceAdapterService);
    };
    $scope.toggleUserDesc = function (open) {
      if ($scope.account.about.length > 150) {
        $scope.isDescOpen = open;
      }
    };
  }
]);
angular.module('bazaarr').controller('FollowCtrl', [
  '$scope',
  '$rootScope',
  '$state',
  'FollowService',
  'AccountService',
  'CollectionService',
  'HttpService',
  'follows',
  function ($scope, $rootScope, $state, FollowService, AccountService, CollectionService, HttpService, follows) {
    /*$scope.follows = follows.data.map(function(fol) {
        fol.type = FollowService.type;
        return fol;
    });*/
    $scope.follows = follows.data;
    $scope.followUser = function (uid, type, index) {
      FollowService.followUser(uid, type).then(function () {
        $scope.follows[index].type = 0 === type ? 1 : 0;
        FollowService.followUserCallback(type);  //AccountService.updateCounts(); //UserService.updateCounts('following_count', type);
      });
    };
    $scope.goFollowing = function () {
    };
    $scope.$parent.doRefresh = function () {
      var promise = {};
      if ($state.includes('account.following-users')) {
        HttpService.addNoCache('following-users');
        promise = FollowService.loadFollowing();
      } else if ($state.includes('account.followers')) {
        HttpService.addNoCache('followed-users');
        promise = FollowService.loadFollowers();
      } else {
        return false;
      }
      AccountService.update();
      promise.then(function (data) {
        $scope.follows = data.data;
        $rootScope.$broadcast('scroll.refreshComplete');
      });
    };
  }
]);
angular.module('bazaarr').controller('EmailNotificationCtrl', [
  '$scope',
  '$state',
  '$ionicPopup',
  '$timeout',
  'EmailNotificationService',
  'UserService',
  'ToastService',
  function ($scope, $state, $ionicPopup, $timeout, EmailNotificationService, UserService, ToastService) {
    if (!UserService.is_login) {
      UserService.post_login.redirect = 'email-notification';
      ToastService.showMessage('danger', 'Please sign in to continue');
      $state.go('login');
      return false;
    }
    $scope.notifications = {};
    $scope.mail_speed_name = 'Once a day at most';
    $scope.selectMailSpeed = function () {
      $scope.mail_speed_popup = $ionicPopup.show({
        title: 'Select server',
        templateUrl: 'views/popups/inputs/select-mail_speed.html',
        scope: $scope,
        buttons: [{ text: 'Cancel' }]
      });
    };
    $scope.setMailSpeed = function (name, value) {
      $scope.mail_speed_name = name;
      $scope.notifications.mail_speed = value;
      $scope.mail_speed_popup.close();
      this.saveSettings($scope.notifications);
    };
    var tpromise = null;
    $scope.saveSettings = function (notifs) {
      if (tpromise) {
        $timeout.cancel(tpromise);
      }
      tpromise = $timeout(function () {
        EmailNotificationService.saveNotifs(notifs, UserService.user.uid).then(function (data) {
          ToastService.showMessage('success', 'Notification settings successfully saved!');
        });
      }, 1000);
    };
    EmailNotificationService.loadSubscribes(UserService.user.uid).then(function (data) {
      $scope.notifications = data.data;
      if ($scope.notifications.mail_speed == 'immediate') {
        $scope.mail_speed_name = 'When they happen';
      }
    });
  }
]);
angular.module('bazaarr').controller('UserListCtrl', [
  '$scope',
  'users',
  'UserListService',
  function ($scope, users, UserListService) {
    $scope.users = users.data;
    $scope.title = UserListService.title;
  }
]);
angular.module('bazaarr').service('UserListService', [
  'HttpService',
  function (HttpService) {
    this.getReclips = function (nid) {
      this.title = 'Reclips';
      HttpService.view_url = 'users-recliped-clip';
      HttpService.params = { nid: nid };
      return HttpService.get();
    };
    this.getLikes = function (nid) {
      this.title = 'Likes';
      HttpService.view_url = 'users-liked-clips';
      HttpService.params = { nid: nid };
      return HttpService.get();
    };
  }
]);
angular.module('bazaarr').service('EmailNotificationService', [
  'HttpService',
  function (HttpService) {
    this.saveNotifs = function (notifs, uid) {
      HttpService.view_url = 'subscribes/' + uid;
      HttpService.params = { data: notifs };
      return HttpService.put();
    };
    this.loadSubscribes = function (uid) {
      HttpService.view_url = 'subscribes/' + uid;
      HttpService.cache = false;
      return HttpService.get();
    };
  }
]);
angular.module('bazaarr').service('StateService', [
  '$state',
  '$rootScope',
  'UserService',
  function ($state, $rootScope, UserService) {
    this.go = function (state, params, broadcast) {
      $state.go(state, params).then(function () {
        if (broadcast) {
          $rootScope.$broadcast(broadcast);
        }
      });
    };
    this.goMyAccount = function () {
      this.goAccount(UserService.user.uid);
    };
    this.goAccount = function (uid) {
      $state.go('account.collections', { userId: uid });
    };
    this.goFeed = function (nid) {
      $state.go('feed', { clipId: nid });
    };
  }
]);
angular.module('bazaarr').service('AboutService', [
  '$state',
  '$rootScope',
  'HttpService',
  function ($state, $rootScope, HttpService) {
    this.loadVar = function (name) {
      HttpService.view_url = 'system/get_variable';
      HttpService.params = { name: name };
      return HttpService.post();
    };
  }
]);
angular.module('bazaarr').service('ToastService', [
  'ngToast',
  function (ngToast) {
    this.showMessage = function (type, message) {
      if (angular.isUndefined(message) || message.length === 0) {
        return false;
      }
      ngToast.create({
        className: type,
        content: message
      });
    };
    this.showDrupalFormMessage = function (type, message) {
      var toast_mess = '';
      angular.forEach(message.form_errors, function (value, key) {
        value = value.replace(/href=\"\/user\/password\"/gi, 'href="#/forgot-password"');
        toast_mess += value + '<br />';
      });
      this.showMessage(type, toast_mess);
    };
  }
]);
angular.module('bazaarr').service('RegistrationService', [
  '$q',
  'HttpService',
  'ToastService',
  function ($q, HttpService, ToastService) {
    this.add = function (user) {
      if (!this.validate(user)) {
        return $q.reject({ 'data': '' });
      }
      HttpService.view_url = 'user/register';
      HttpService.is_auth = false;
      HttpService.params = user;
      return HttpService.post();
    };
    this.validate = function (user) {
      if (angular.isUndefined(user.name)) {
        ToastService.showMessage('danger', 'Please, enter your Username');
        return false;
      }
      if (user.name.length < 3) {
        ToastService.showMessage('danger', 'Username should be longer than 3 characters');
        return false;
      }
      /*if (angular.isUndefined(user.mail)) {
            ToastService.showMessage("danger", "Please, enter your E-mail");
            return false;
        }*/
      var re = /^([A-Za-z0-9]{1}[\w-]*(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
      if (angular.isUndefined(user.mail) || !re.test(user.mail)) {
        ToastService.showMessage('danger', 'Please, enter correct e-mail');
        return false;
      }
      if (angular.isUndefined(user.pass)) {
        ToastService.showMessage('danger', 'Please, enter your Password');
        return false;
      }
      if (user.pass.length < 6) {
        ToastService.showMessage('danger', 'Password should be longer than 6 characters');
        return false;
      }
      return true;
    };
  }
]);
angular.module('bazaarr').service('AccountService', [
  '$rootScope',
  '$state',
  '$timeout',
  'HttpService',
  'UserService',
  function ($rootScope, $state, $timeout, HttpService, UserService) {
    this.account = {};
    this.account_id = 0;
    this.is_my_account = true;
    this.counts_update = false;
    this.fileLoad = function (fid) {
      HttpService.view_url = 'file/' + fid;
      return HttpService.get();
    };
    this.contactAccount = function (contact) {
      HttpService.view_url = 'contact';
      HttpService.params = { 'contact': contact };
      return HttpService.post();
    };
    this.loadAbout = function () {
      return this.account_id || UserService.user.uid;
    };
    this.getAccountId = function () {
      return this.account_id || UserService.user.uid;
    };
    this.getAccount = function () {
      return !!this.account.uid ? this.account : UserService.user;
    };
    this.load = function (uid) {
      /*
        if ((0 === uid || (uid === this.account_id)) && !this.counts_update) {
            return this.account;
        }*/
      this.account_id = uid;
      this.is_my_account = false;
      if (UserService.user.uid === uid) {
        this.is_my_account = true;
        this.counts_update = false;  //this.account        = UserService.user;
                                     //return this.account;
      }
      HttpService.view_url = 'user/' + uid;
      //HttpService.view_url = "user-info";
      //HttpService.params   = {"uid" : uid};
      HttpService.is_auth = false;
      //HttpService.cache    = false;
      var promise = HttpService.get();
      var that = this;
      promise.then(function (data) {
        that.account = data.data;
        if (that.account.about && that.account.about.length > 150) {
          var obj = new CutString(that.account.about, 150);
          that.account.about_short = obj.cut();
          if (that.account.about_short.length - that.account.about_short.lastIndexOf('...') == 3) {
            that.account.about_short = that.account.about_short.substr(0, that.account.about_short.lastIndexOf('...')) + ' <span class="expand">(More...)</span>';
          }
        } else {
          that.account.about_short = that.account.about;
        }
        $timeout(function () {
          $rootScope.$broadcast('profile:update');
        }, 200);
      });
      return promise;
    };
    this.saveAccount = function (account, file) {
      // p(account);return
      HttpService.view_url = 'user/' + account.uid;
      // "pass-reset-token"
      var params = {
          'data': {
            'uid': account.uid,
            'name': account.name,
            'description': account.about,
            'website': account.website,
            'location': account.location
          }
        };
      if (account.current_pass) {
        params.data.current_pass = account.current_pass;
      }
      if (UserService.user.mail != account.mail && account.current_pass) {
        params.data.mail = account.mail;
        params.data.current_pass = account.current_pass;
      }
      if (account.pass) {
        params.data.pass = account.pass;
        params.data.current_pass = account.current_password;
      }
      if (file) {
        params.data.picture = file.fid;
      }
      HttpService.params = params;
      if (UserService.user.forgot_password) {
        HttpService._params = { 'pass-reset-token': UserService.user.pass_reset_token };
      }
      return HttpService.put();
    };
    this.addFile = function (file, account) {
      if (typeof file.fid == 'undefined') {
        return false;
      }
      file.filename = 'device.jpg';
      file.filepath = 'public://pictures/' + file.filename;
      HttpService.view_url = 'file';
      HttpService.params = file;
      return HttpService.post();
    };
    /* don't use this */
    this.updateCounts = function () {
      this.counts_update = true;
    };
    /* use this */
    this.updateCounters = function (counter_name, type, not_my_account) {
      not_my_account = not_my_account || false;
      HttpService.addNoCache('user/' + UserService.user.uid);
      if (this.account_id == UserService.user.uid || not_my_account) {
        var counter = parseInt(this.account[counter_name]);
        this.account[counter_name] = type ? counter + 1 : counter - 1;
        $rootScope.$broadcast('profile:update');
      }
    };
    this.update = function () {
      var that = this;
      HttpService.addNoCache('user/' + this.getAccountId());
      this.load($state.params.userId).then(function (data) {
        that.account = data.data;
        $rootScope.$broadcast('profile:update');
      });
    };
  }
]);
angular.module('bazaarr').service('FollowService', [
  '$rootScope',
  '$ionicHistory',
  'HttpService',
  'AccountService',
  'CollectionService',
  function ($rootScope, $ionicHistory, HttpService, AccountService, CollectionService) {
    this.params = {};
    this.type = 0;
    this.colls = {};
    this.loadFollowing = function () {
      this.type = 0;
      HttpService.view_url = 'following-users';
      HttpService.params = { 'uid': AccountService.getAccountId() };
      HttpService.is_auth = false;
      var promise = HttpService.get();
      return this.preRender(promise);
    };
    this.loadCollections = function () {
      HttpService.view_url = 'collections-followed';
      HttpService.params = { 'uid': AccountService.getAccountId() };
      HttpService.is_auth = false;
      return HttpService.get();
    };
    this.loadFollowers = function () {
      this.type = 1;
      HttpService.view_url = 'followed-users';
      HttpService.params = { 'uid': AccountService.getAccountId() };
      HttpService.is_auth = false;
      var promise = HttpService.get();
      return this.preRender(promise);
    };
    this.followUser = function (uid, type) {
      HttpService.addNoCache('user/' + uid);
      HttpService.view_url = 'follow/' + uid;
      HttpService.params = {
        'type': 'user',
        'action': type
      };
      return HttpService.put();
    };
    this.followCollection = function (bid, type) {
      HttpService.view_url = 'follow/' + bid;
      HttpService.params = {
        'type': 'collection',
        'action': type
      };
      var promise = HttpService.put();
      promise.then(function () {
        CollectionService.updateCollectionField(bid, 'followed', type, 'update');
      });
      return promise;
    };
    this.followUserCallback = function (type) {
      this.clearCache();
      AccountService.updateCounters('following_count', type);
    };
    this.followElseUserCallback = function (type) {
      this.followUserCallback();
      AccountService.updateCounters('followers_count', type, true);
      $rootScope.$broadcast('collections:follow', { type: type });
    };
    this.clearCache = function () {
      HttpService.addNoCache('following-users');
      HttpService.addNoCache('followed-users');
      HttpService.addNoCache('following');
      HttpService.addNoCache('collections-followed');
      HttpService.addNoCache('get_user_collections/' + AccountService.getAccountId());
      HttpService.addNoCache('user/' + AccountService.getAccountId());  //$ionicHistory.clearCache();
    };
    this.preRender = function (promise) {
      var type = this.type;
      promise.then(function (data) {
        data.data = data.data.map(function (d) {
          d.type = 1;
          if (0 === type || angular.isDefined(d.is_folowed)) {
            d.type = 0;
          }
          return d;
        });
      });
      return promise;
    };
    this.followCollectionCallback = function (user_follow) {
      this.clearCache();
      if (user_follow === false) {
        HttpService.addNoCache('following-users');
        HttpService.addNoCache('followed-users');
        AccountService.updateCounters('following_count', 0);
      }
    };
  }
]);
angular.module('bazaarr').service('HttpService', [
  '$q',
  '$http',
  '$cacheFactory',
  '$rootScope',
  '$ionicLoading',
  '$ionicHistory',
  '$cordovaNetwork',
  'ConfigService',
  'UserService',
  'DeviceAdapterService',
  'ToastService',
  function ($q, $http, $cacheFactory, $rootScope, $ionicLoading, $ionicHistory, $cordovaNetwork, ConfigService, UserService, DeviceAdapterService, ToastService) {
    this.view_url = '';
    this.params = {};
    this._params = {};
    this.page = 0;
    this.method = 'get';
    this.is_auth = true;
    this.cache = true;
    this.no_cache = {};
    this.show_cnt = 0;
    this.online = true;
    this.setDefault = function () {
      this.view_url = '';
      this.params = {};
      this.page = 0;
      this.method = 'get';
      this.is_auth = true;
      this.cache = true;
    };
    this.get = function () {
      this.method = 'get';
      return this.load();
    };
    this.post = function () {
      this.method = 'post';
      return this.load();
    };
    this.put = function () {
      this.method = 'put';
      return this.load();
    };
    this.dell = function () {
      this.method = 'delete';
      return this.load();
    };
    this.delete = function () {
      return this.dell();
    };
    this.load = function () {
      var config = {};
      var api_url = 'api/v1';
      if (this.is_auth) {
        config = UserService.getConfig();
        if (!config) {
          return false;
        }  //api_url = "apiuser";
      }
      var url = ConfigService.server_url() + '/' + api_url + '/' + this.view_url + '/' + '?prot=http:&dom=' + ConfigService.connect_url() + (this.page ? '&page=' + this.page : '') + ('get' === this.method && Object.keys(this.params).length ? this.objToGet(this.params) : '') + (Object.keys(this._params).length ? this.objToGet(this._params) : '');
      ;
      if (this.no_cache[this.view_url]) {
        var $httpDefaultCache = $cacheFactory.get('$http');
        $httpDefaultCache.remove(url);
        delete this.no_cache[this.view_url];
      }
      if (this.cache) {
        config.cache = true;
      }
      var dfd = $q.defer();
      this.online = true;
      if (DeviceAdapterService.is_ready && $cordovaNetwork.isOffline()) {
        this.online = false;
        ToastService.showMessage('danger', 'No Internet Connection');
      }
      if (!this.online && this.page) {
        return $q.reject({ 'data': 'No Internet Connection' });
      }
      switch (this.method) {
      case 'get':
        dfd.resolve($http.get(url, config));
        break;
      case 'post':
        dfd.resolve($http.post(url, this.params, config));
        break;
      case 'put':
        dfd.resolve($http.put(url, this.params, config));
        break;
      case 'delete':
        dfd.resolve($http.delete(url, config));
        break;
      }
      //p(dfd.promise);
      var promise = dfd.promise;
      if ('get' == this.method && !this.page && this.online) {
        $ionicLoading.show();
        this.show_cnt++;
        var that = this;
        promise.then(function () {
          if (that.show_cnt === 1) {
            $ionicLoading.hide();
          }
          that.show_cnt--;
        }, function () {
          $ionicLoading.hide();
        });
      }
      this.setDefault();
      return promise;
    };
    this.objToGet = function (obj) {
      var str = '';
      for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
          str += '&' + p + '=' + obj[p];
        }
      }
      return str;
    };
    this.addNoCache = function (view_url) {
      this.no_cache[view_url] = true;
    };
    this.clearCache = function () {
      $ionicHistory.clearCache();
      var $httpDefaultCache = $cacheFactory.get('$http');
      $httpDefaultCache.removeAll();
      $rootScope.clearClipPager();
    };
  }
]);
angular.module('bazaarr').service('UserService', [
  '$q',
  '$http',
  '$rootScope',
  '$cookies',
  '$cookieStore',
  '$state',
  '$timeout',
  'localStorageService',
  'ConfigService',
  'ToastService',
  function ($q, $http, $rootScope, $cookies, $cookieStore, $state, $timeout, localStorageService, ConfigService, ToastService) {
    this.is_login = false;
    this.token = '';
    this.user = {};
    this.session_name = '';
    this.post_login = {};
    this.getToken = function () {
      var dfd = $q.defer();
      dfd.resolve($http.post(ConfigService.server_url() + '/services/session/token' + '?prot=http:&dom=' + ConfigService.connect_url(), { 'uid': this.user.uid }));
      return dfd.promise;
    }, this.setUser = function (user) {
      this.user = user;
      var session = localStorageService.get('session');
      session.user = user;
      localStorageService.set('session', session);
    };
    //set user to service & LS after login
    //redirect it to account
    this.store = function (user) {
      //this.setUser();
      $cookies[user.session_name] = user.sessid;
      localStorageService.set('session', user);
      this.token = user.token;
      this.is_login = true;
      this.user = user.user;
      this.session_name = user.session_name;
      $rootScope.user = this.user;
    };
    this.loginCallback = function (data) {
      this.store(data);
      if (Object.keys(this.post_login).length) {
        $state.go(this.post_login.redirect, this.post_login.params);
        if (angular.isDefined(this.post_login.broadcast) && this.post_login.broadcast.length) {
          var broadcast = this.post_login.broadcast;
          $timeout(function () {
            $rootScope.$broadcast(broadcast);
          }, 500);
        }
        this.post_login = {};
      } else {
        $state.go('account.collections', { 'userId': data.user.uid });
      }
    };
    this.isConnect = function () {
      var config = this.getConfig();
      var dfd = $q.defer();
      dfd.resolve($http.post(ConfigService.server_url() + '/api/v1/system/connect' + '?prot=http:&dom=' + ConfigService.connect_url(), {}, config));
      return dfd.promise;
    };
    this.signIn = function (user, type) {
      if (!this.signInValidate(user, type)) {
        return $q.reject({ 'data': '' });
      }
      type = type || 'user/login';
      var config = this.getConfig();
      //user.device_id = DeviceAdapterService.getUUID();
      var dfd = $q.defer();
      dfd.resolve($http.post(ConfigService.server_url() + '/api/v1/' + type + '/' + '?prot=http:&dom=' + ConfigService.connect_url(), user));
      return dfd.promise;
    }, this.signInValidate = function (user, type) {
      if ((angular.isUndefined(user.username) || angular.isUndefined(user.password)) && type != 'social') {
        ToastService.showMessage('danger', 'Please make sure that you\'ve entered your username and password correctly');
        return false;
      }
      return true;
    };
    this.logout = function () {
      var config = this.getConfig();
      if (!config) {
        return false;
      }
      var dfd = $q.defer();
      dfd.resolve($http.post(ConfigService.server_url() + '/api/v1/user/logout/' + '?prot=http:&dom=' + ConfigService.connect_url(), {}, config));
      return dfd.promise;
    }, this.getConfig = function () {
      if (!this.is_login || !this.token) {
        return false;
      }
      return {
        'headers': {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.token
        }
      };
    }, this.clearCookies = function () {
      angular.forEach($cookies, function (v, k) {
        $cookieStore.remove(k);
      });
    }, this.clearUser = function () {
      this.token = '';
      this.is_login = false;
      this.user = {};
      $rootScope.user = {};
      //$cookieStore.remove(UserService.session_name);
      this.clearCookies();
      this.session_name = '';
      localStorageService.remove('session');
    };
    this.updateCounts = function (name, value) {
      return true;
      if (typeof this.user[name] != 'undefined') {
        var val = parseInt(value), old_val = parseInt(this.user[name]);
        this.user[name] = val ? old_val + val : old_val - 1;
        this.setUser(this.user);
        return this.user[name];
      }
    };
  }
]);
angular.module('bazaarr').service('DeviceAdapterService', [
  '$cordovaDevice',
  '$cordovaCamera',
  '$compile',
  function ($cordovaDevice, $cordovaCamera, $compile) {
    this.is_ready = false, this.getUUID = function () {
      return this.is_ready ? $cordovaDevice.getUUID() : '';
    }, this.getCameraPhoto = function () {
    }, this.getCameraOptions = function (source_type_id, camera_direction) {
      camera_direction = camera_direction || 0;
      return {
        quality: 85,
        destinationType: Camera.DestinationType.DATA_URL,
        sourceType: source_type_id,
        allowEdit: false,
        encodingType: Camera.EncodingType.JPEG,
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: false,
        cameraDirection: camera_direction,
        correctOrientation: true
      };
    }, this.getAndroidPushConfig = function () {
      return { 'senderID': '708812439397' };
    };
    this.getInAppBrowserConfig = function () {
      if (ionic.Platform.isAndroid()) {
        return {
          location: 'yes',
          clearcache: 'no',
          toolbar: 'no',
          clearsessioncache: 'no'
        };
      }
      if (ionic.Platform.isIOS()) {
        return {
          location: 'yes',
          clearcache: 'no',
          clearsessioncache: 'no'
        };
      }
    };
  }
]);
angular.module('bazaarr').service('userPicture', [
  '$ionicLoading',
  '$ionicPopup',
  '$cordovaCamera',
  'UserService',
  'DeviceAdapterService',
  'AccountService',
  'ToastService',
  'HttpService',
  function ($ionicLoading, $ionicPopup, $cordovaCamera, UserService, DeviceAdapterService, AccountService, ToastService, HttpService) {
    this.popup = null;
    this.imgPopup = function (scope) {
      if (AccountService.account.uid != UserService.user.uid) {
        return false;
      }
      scope.image_src = UserService.user.big_picture;
      this.popup = $ionicPopup.show({
        title: 'Change your picture',
        templateUrl: 'views/popups/inputs/profile-photo.html',
        scope: scope,
        cssClass: 'profile-photo',
        buttons: [{ text: 'Cancel' }]
      });
    };
    this.closePopup = function () {
      if (this.popup) {
        this.popup.close();
      }
    };
    this.uploadImage = function (scope) {
      $ionicLoading.show();
      AccountService.addFile(scope.file, scope.account).then(function (data) {
        var file = data.data;
        scope.account.fid = file.fid;
        AccountService.saveAccount(scope.account, file).then(function (data) {
          if (!angular.isUndefined(file) && file.fid) {
            scope.account.fid = file.fid;
            scope.account.picture = data.data.img;
            scope.account.big_picture = data.data.img;
            HttpService.clearCache();
          }
          if (AccountService.account.uid == UserService.user.uid) {
            AccountService.account = scope.account;
          }
          UserService.setUser(scope.account);
          $ionicLoading.hide();
          ToastService.showMessage('success', 'You changed your picture!');
        });
      }, function (reason) {
        ToastService.showMessage('danger', reason.data);
        $ionicLoading.hide();
      });
    };
    this.openPhotoSourcePopup = function (scope, is_ready) {
      this.closePopup();
      var opts = {
          title: 'Select source',
          templateUrl: 'views/popups/photo_source.html',
          scope: scope
        }, self = this;
      if (!is_ready) {
        opts.title = 'Select Picture';
        opts.templateUrl = 'views/popups/web_photo_source.html';
        opts.buttons = [
          {
            text: 'Select',
            onTap: function () {
              if (angular.isUndefined(scope.file)) {
                p('error');
                return false;
              }
              scope.image_src = scope.file.file;
              scope.file.fid = null;
              self.uploadImage(scope);
            }
          },
          { text: 'Cancel' }
        ];
      }
      this.photo_source_popup = $ionicPopup.show(opts);
    };
    this.closeImagePopup = function (scope) {
      this.photo_source_popup.close();
    };
    this.setCanvasImage = function (element, _url, scope) {
      if (angular.isUndefined(scope.file)) {
        scope.file = { file: null };
      }
      var canvas = document.getElementById('canvas'), MAX_WIDTH = document.getElementById('canvas_wrapp').clientWidth, img = new Image();
      var f = element.files[0], url = window.URL || window.webkitURL, src = url.createObjectURL(f);
      var FR = new FileReader();
      FR.onload = function (e) {
        scope.file.file = e.target.result;
        img.src = src;
      };
      FR.readAsDataURL(f);
      img.onload = function () {
        if (img.width > MAX_WIDTH) {
          img.height *= MAX_WIDTH / img.width;
          img.width = MAX_WIDTH;
        }
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'block';
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        url.revokeObjectURL(src);
      };
    };
    this.changedFile = function (element, scope) {
      var p = this;
      scope.$apply(function (scope) {
        p.setCanvasImage(element, null, scope);
      });
    };
    this.addPhoto = function (source_type_id, scope, Device) {
      this.closeImagePopup(scope);
      if (!Device.is_ready) {
        return false;
      }
      var p = this;
      $cordovaCamera.getPicture(Device.getCameraOptions(source_type_id, 1)).then(function (imageData) {
        if (angular.isUndefined(scope.file)) {
          scope.file = {};
        }
        scope.file.file = imageData;
        scope.file.fid = null;
        scope.image_src = 'data:image/jpeg;base64,' + imageData;
        p.uploadImage(scope);
      }, function (err) {
        ToastService.showMessage('danger', err);
      });
    };
  }
]);
angular.module('bazaarr').service('ClaimService', [
  '$rootScope',
  '$state',
  '$timeout',
  'HttpService',
  function ($rootScope, $state, $timeout, HttpService) {
    this.claim = function (params) {
      HttpService.view_url = 'claim-account/create';
      HttpService.is_auth = false;
      HttpService.params = { 'data': params };
      return HttpService.post();
    };
    this.load_users = function (search) {
      HttpService.view_url = 'claim-account';
      HttpService.is_auth = false;
      HttpService.params = { 'name': search };
      return HttpService.get();
    };
  }
]);