'use strict';
angular.module('bazaarr').controller('ClipCtrl',
function($scope, $state, $timeout, $rootScope, $ionicViewSwitcher, $ionicPopover, $ionicPopup, $cordovaSocialSharing,
ClipsService, ClipService, UserService, FollowService, AccountService, ToastService, StateService, ConfigService, MetaService, clip) {
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
        $scope.clip         = clip.data[0];
        $scope.action       = false;
        //$scope.back_view    = $scope.clip.page_list;
        
        MetaService.set("clip", "", {"description" : $scope.clip.desc_text, "nid" : $scope.clip.nid});
    }
    
    $scope.orientation_changed = false;
    //$scope.loadClip();

//p($scope.slide_clips);
    $scope.$on('clip:like', function(event) {
        $scope.clipActionLike();
    });
    
    $scope.$on('clip:block', function(event) {
        $scope.clipActionBlock();
    });
    
    $scope.$on('clip:reclip', function(event) {
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

    $scope.nextSlide = function() {
        if (!$scope.action) {
            $timeout(function(){
                var prev_clip_nid = ClipService.clip.nid;
                var clip = ClipService.getClip(1);
                $ionicViewSwitcher.nextDirection('up');
                if (Object.keys(clip).length) {
                    goToClip(clip);
                }
                else {
                    ToastService.showMessage("danger", "No more clips in collection");
                }
                $scope.action = false;
            }, 200);
        }
        $scope.action = true;
    };

    $scope.prevSlide = function() {
        if (!$scope.action) {
            $timeout(function(){
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
            $state.go("clip", {"clipId" : clip.nid});
        }
        //$ionicScrollDelegate.$getByHandle('clipSingle').scrollTop(true);
    }

    $scope.checkSlide = function(index) {
        var page_list = this.page_list || ClipsService.page_api_url;//this.clip.page_list || ClipsService.page_api_url;
        var clips = ClipsService.clips[page_list];
        var clip = {};
        angular.forEach(clips, function(value, key) {
            if (value.nid === $state.params.clipId && angular.isDefined(clips[key + index])) {
                clip = clips[key + index];
            }
        });
        if(Object.keys(clip).length) {
            return true;
        } else {
            return false;
        }
    };

    $scope.isList = function() {
        if(ClipService.page_list) {
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
    $scope.clipActionReclip = function(nid) {
        if($scope.clip_actions_popup) {
            $scope.clip_actions_popup.close();
        }
        if (!UserService.is_login) {
            UserService.post_login.redirect     = "clip";
            UserService.post_login.params       = {clipId : ClipService.clip.nid};
            UserService.post_login.broadcast    = "clip:reclip";

            ToastService.showMessage("danger", "Please sign in to make reclips");
            $state.go('login');
            return false;
        }
        if(!nid) {
            nid = $state.params.clipId;
        }
        if (parseInt(ClipService.clip.uid) === parseInt(UserService.user.uid)) {
            ToastService.showMessage("danger", "You cannot reclip your clip");
            return false;
        }
		
        $state.go('reclip', {clipId: nid});
    };

    // Edit action
    $scope.clipActionEdit = function(nid) {
        if($scope.clip_actions_popup) {
            $scope.clip_actions_popup.close();
        }
        $scope.clipPopover.hide();
        if(!nid) {
            nid = $state.params.clipId;
        }
        $state.go('edit-clip', {clipId: nid});
    };

    // Go to comments
    $scope.clipActionComments = function(nid) {
        if($scope.clip_actions_popup) {
            $scope.clip_actions_popup.close();
        }
        if(!nid) {
            nid = $state.params.clipId;
        }
        $state.go('comments', {clipId: nid});
    };

    // Like action
    $scope.clipActionLike = function() {
        if($scope.clip_actions_popup) {
            $scope.clip_actions_popup.close();
        }
        if (!UserService.is_login) {
            UserService.post_login.redirect     = "clip";
            UserService.post_login.params       = {clipId : ClipService.clip.nid};
            UserService.post_login.broadcast    = "clip:like";

            ToastService.showMessage("danger", "Please sign in to like Clips");
            $state.go('login');
            return false;
        }

        if(ClipService.clip.voted){
            ClipService.clip.voted = 0;
        } else {
            ClipService.clip.voted = 1;
        }

        if(ClipService.clip.voted){
            ClipService.clip.like_count = (parseInt(ClipService.clip.like_count) || 0) + 1;
        } else {
            ClipService.clip.like_count = (parseInt(ClipService.clip.like_count) - 1 || 0);
        }

        //AccountService.updateCounts();//UserService.updateCounts('liked_count', ClipService.clip.voted);
        AccountService.updateCounters('liked_count', ClipService.clip.voted);

        ClipService.likeClip(ClipService.clip);
    };

    // Block
    $scope.clipActionBlock = function() {
        if (!UserService.is_login) {
            UserService.post_login.redirect     = "clip";
            UserService.post_login.params       = {clipId : ClipService.clip.nid};
            UserService.post_login.broadcast    = "clip:block";

            ToastService.showMessage("danger", "Please sign in to make reports on Clip");
            if($scope.clip_actions_popup) {
                $scope.clip_actions_popup.close();
            }
            if($scope.clipPopover) {
                $scope.clipPopover.hide();
            }
            $state.go('login');

            return false;
        }
        ClipService.blockClip().then(function(data){
            ClipService.clip.bloked = data.data.block || 0;
            ClipsService.updateClipInList(ClipService.clip);
            if($scope.clip_actions_popup) {
                $scope.clip_actions_popup.close();
            }
            $scope.clipPopover.hide();
        });
    };

    $scope.clipFollowUser = function() {
        if (!UserService.is_login) {

            ToastService.showMessage("danger", "Please sign in to follow User");
            $state.go('login');
            if($scope.clipPopover) {
                $scope.clipPopover.hide();
            }
            return false;
        }

        var type = ClipService.clip.is_follow_user ? 0 : 1;

        FollowService.followUser(ClipService.clip.uid, type).then(function(data){
            ClipService.clip.is_follow_user = type;
            FollowService.followUserCallback(type);//AccountService.updateCounts();//UserService.updateCounts('following_count', type);

            if($scope.clip_actions_popup) {
                $scope.clip_actions_popup.close();
            }

            $scope.clipPopover.hide();
            ToastService.showMessage("success", data.data.message);
        });
    };

    $scope.clipFollowCollection = function() {
        if (!UserService.is_login) {

            ToastService.showMessage("danger", "Please sign in to follow Collection");
            $state.go('login');
            if($scope.clipPopover) {
                $scope.clipPopover.hide();
            }
            return false;
        }
        var type = ClipService.clip.is_follow_collection ? 0 : 1;
        FollowService.followCollection(ClipService.clip.collection_id, type).then(function(data){
            ClipService.clip.is_follow_collection = type;
            if($scope.clip_actions_popup) {
                $scope.clip_actions_popup.close();
            }
            $scope.clipPopover.hide();
            ToastService.showMessage("success", data.data.message);
            FollowService.followUserCallback(type);
        });
    };

    $scope.checkBlocked = function(bloked) {
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
            return "";
        }
        
        return ClipService.clip.voted ? "liked" : "";
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

    $scope.isReport = function() {
        if (angular.isUndefined(ClipService.clip)) {
            return false;
        }

        if (angular.isDefined(ClipService.clip.bloked) && 0 === ClipService.clip.bloked) {
            return true;
        }

        return false;
    };

    $scope.canReclip = function() {  
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

    $scope.backClip = function() {
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
            $timeout(function() {
                $rootScope.$broadcast("orientation:change");
            });
            $scope.orientation_changed = false;
        }
    };

    $scope.shareClip = function() {
        if (!$rootScope.is_app) {
            return false;
        }
        var link = ConfigService.server_url() + "/clip/" + $scope.clip.nid;
        var desc = "Hi! Take a look at this clip on Bazaarr: " + $scope.clip.desc_text + "\n\r\n";
        //ImageService.convertImgToBase64URL($scope.clip.img_large).then(function(data) {
            $cordovaSocialSharing.share(desc, "This clip on Bazaarr may be interesting for you!", null, link)
            .then(function(result) {
                ToastService.showMessage("success", "Successfully sent!");
            }, function(err) {
                ToastService.showMessage("danger", "Error occured");
            });
        //}, function() {
        //    ToastService.showMessage("danger", "Error occured");
        //});
    };

    $scope.goFeed = function() {
        if ($scope.clip.source_url) {
            $scope.openFeed($scope.clip.nid, $scope.clip.is_ebay);
        }
    }

    $scope.toggleDescription = function(isAreaClick) {

        if (isAreaClick && !document.body.classList.contains('desc-open')) {
            if(!$scope.clip.is_ebay && !$scope.clip.source_url) {
                $state.go("clip-full", {clipId : $scope.clip.nid});
                return;
            }
            $scope.openFeed($scope.clip.nid, $scope.clip.is_ebay)
        }

        if($scope.clip.desc_text.length > 50) {
            if(document.body.classList.contains('desc-open') && isAreaClick) {
                var obj = new CutString($scope.clip.desc, 50);
                $scope.clip.full_short_desc = obj.cut();
                document.body.classList.remove('desc-open');
                if($scope.clip.full_short_desc.length - $scope.clip.full_short_desc.lastIndexOf('...') == 3) {
                    $scope.clip.full_short_desc = $scope.clip.full_short_desc.substr(0, $scope.clip.full_short_desc.lastIndexOf ('...')) + '<span class="expand">...</span>'
                }
            } else if(!isAreaClick) {
                $scope.clip.full_short_desc = $scope.clip.desc;
                document.body.classList.add('desc-open');
            }
        }
        /*if ($scope.clip.source_url && $scope.clip.price > 0) {
            $rootScope.openInApp($scope.clip.source_url, false, $scope.clip.is_video)
        }
        if ($scope.clip.source_url && !$scope.clip.price) {
            $scope.openFeed($scope.clip.nid)
        }*/
    };

    $scope.toggleHDescription = function() {
        if(document.body.classList.contains('desc-h-open')) {
            document.body.classList.remove('desc-h-open');
        } else {
            document.body.classList.add('desc-h-open');
        }
    };

    $ionicPopover.fromTemplateUrl('views/menu/clip_popover.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.clipPopover = popover;
    });

    $scope.openPopover = function($event) {
        $scope.clipPopover.show($event);
    };

    $scope.onHold = function(clip) {
        ClipService.clip    = clip;
        $scope.clip         = ClipService.clip;
        $scope.clip_owner   = ClipService.clip.uid == UserService.user.uid;

        $scope.clip_actions_popup = $ionicPopup.show({
            title: 'Clip actions',
            cssClass: 'popup-actions',
            templateUrl: 'views/popups/clip_actions.html',
            buttons: [
                {
                    text: 'Cancel'
                }
            ],
            scope: $scope
        });
    };
    
    $scope.openFeed = function(nid, is_ebay) {
        StateService.goFeed(nid, is_ebay);
    };

    $scope.checkClipSize = function() {
        window.wideClip = $scope.clip.wideClip;
    };

    $scope.clipResize = function(){
        var containers = document.getElementsByClassName("uname-container");
        if(containers.length > 0) {
            var container = containers[1] ? containers[1] : containers[0];
            var name = container.getElementsByClassName("resizable-text")[0];
            var containerChildren = container.children;
            var containerWidth = container.offsetWidth;
            var fontSize = 16;
            while(fontSize > 8) {
                fontSize--;
                name.style.fontSize = fontSize + 'px';
                var widthSumm = 0;
                for(var i = 0; i < containerChildren.length; i++) {
                    widthSumm += containerChildren[i].offsetWidth + 2;
                }
                if(containerWidth > widthSumm) {
                    break;
                }
            }
        }
        if(window.wideClip) {
            setTimeout(function(){
                var ratio = $scope.clip.img_h / $scope.clip.img_w;
                var clipArticle = document.querySelectorAll(".clip.article");
                if(clipArticle.length > 0) {
                    clipArticle = (clipArticle[1] ? clipArticle[1] : clipArticle[0]);
                    var image = clipArticle.querySelector(".clip .image img");
                    var bottomWrapper = clipArticle.getElementsByClassName('bottom-wrapper')[0];
                    var bottomHeight = bottomWrapper.offsetHeight;
                    var textWrapper = clipArticle.getElementsByClassName('text-wrapper')[0];
                    var text = clipArticle.getElementsByClassName('text')[0];
                    var textInner = text.getElementsByClassName('text-inner')[0];
                    var textWrapperTop = 25 + window.innerWidth * ratio + text.offsetTop;
                    var textWrapperHeight = window.innerHeight - (textWrapperTop + bottomHeight);
                    var linesCount = (textWrapperHeight - textWrapperHeight % Math.floor(16 * 1.3)) / Math.floor(16 * 1.3);
                    // Apply new lines count to the HTML element
                    text.style.webkitLineClamp = linesCount ? linesCount : 1;
                    text.style.mozLineClamp = linesCount ? linesCount : 1;
                    // Check for overlapping of the description by the bottom wrapper
                    var hDiff = textWrapper.offsetTop + textWrapper.offsetHeight - bottomWrapper.offsetTop;
                    if(hDiff >= 10) {
                        // Minimize image height to make description visible
                        image.style.maxHeight = (image.offsetHeight - hDiff + 10) + 'px';
                    } else {
                        image.style.maxHeight = '';
                    }
                    if(text.offsetHeight - textInner.offsetHeight < 0) {
                        document.body.classList.add('desc-short');
                    } else {
                        document.body.classList.remove('desc-short');
                    }
                }
            }, 100);
        }
    }

    $scope.$on('orientation:change', function(event) {
        $scope.orientation_changed = true;
        $scope.clipResize();
    });

    if ($state.includes("clip")) {
        $timeout(function(){
            $scope.checkClipSize();
            $scope.clipResize();
        })
    }
});

angular.module('bazaarr').controller('CommentCtrl',
function($scope, $state, $ionicPopup, $ionicLoading, 
CommentService, UserService, ClipService, ToastService, ClipsService, comments, reclip_users, like_users) {
    $scope.comments                 = comments.data;
    $scope.reclip_users             = reclip_users.data;
    $scope.like_users               = like_users.data;
    $scope.new_comment              = {};
    $scope.new_comment.body_value   = "";

    $scope.addComment = function() {
        $ionicLoading.show();
        $scope.new_comment.nid = $state.params.clipId;

        CommentService.add($scope.new_comment).then(function(data){
            $scope.new_comment.picture          = {};
            $scope.new_comment.picture.small    = UserService.user.picture;
            $scope.new_comment.name             = UserService.user.name;
            $scope.new_comment.uid              = UserService.user.uid;
            $scope.new_comment.cid              = data.data.cid;
            $scope.comments.push($scope.new_comment);
            $scope.new_comment = {};
            
            ClipService.clip.comment_count++;
            $ionicLoading.hide();
        }, function(reason) {
            ToastService.showMessage("danger", reason.data);
            $ionicLoading.hide();
        });
    };

    $scope.goLogin = function() {
        UserService.post_login.redirect     = "comments";
        UserService.post_login.params       = {clipId : $state.params.clipId};

        $state.go('login');
    };

    $scope.openActionsPopup = function(comment) {
        if (comment.uid !== UserService.user.uid) {
            return false;
        }

        comment.index           = this.$parent.$index;
        CommentService.comment  = comment;

        $scope.comment_actions_popup = $ionicPopup.show({
            title: 'Comment actions',
            cssClass: 'popup-actions',
            templateUrl: 'views/popups/comment-actions.html',
            buttons: [
                {
                    text: 'Cancel',
                    onTap: function(e) {
                        $scope.closeActionsPopup();
                    }
                }
            ],
            scope: $scope
        });
    };

    $scope.openEditPopup = function() {
        $scope.comment = CommentService.comment;
        $scope.comment_edit_popup = $ionicPopup.show({
            title: 'Edit comment',
            templateUrl: 'views/popups/inputs/comment-edit.html',
            buttons: [
                {
                    text: 'Cancel'
                },
                {
                    text: 'Save',
                    onTap: function(e) {
                        CommentService.save().then(function(data){
                            $scope.comments[CommentService.comment.index].body_value = $scope.comment.body_value;
                        }, function(reason) {
                            ToastService.showMessage("danger", reason.data);
                        });
                    }
                }
            ],
            scope: $scope
        });

        $scope.closeActionsPopup();
    };

    $scope.deleteComment = function() {
        var confirmPopup = $ionicPopup.confirm({
            title: 'Delete comment',
            template: '<div class="delete-text">Are you sure you want to delete this comment?</div>'
        });
        confirmPopup.then(function(res) {
            if (res) {
                CommentService.delete().then(function(data){
                    ClipService.clip.comment_count--;
                    $scope.comments.splice(CommentService.comment.index, 1);
                    ToastService.showMessage("success", "Comment successfully deleted!");
                },
                function(reason) {
                    ToastService.showMessage("danger", reason.data);
                });
            }
        });

        $scope.closeActionsPopup();
    };

    $scope.closeActionsPopup = function() {
        $scope.comment_actions_popup.close();
    };

    $scope.textareaLimit = function(textarea, rows, chars) {
        var newValue;
        if($scope.new_comment.body_value){
            var valueSegments = $scope.new_comment.body_value.split('\n');
            if(rows != undefined && valueSegments.length > rows) { // too many rows
                newValue = valueSegments.slice(0, rows).join("\n");
            }
            if(chars != undefined && $scope.new_comment.body_value.length > chars) { // too many chars
                if(newValue != undefined)
                    newValue = newValue.substring(0, chars);
                else
                    newValue = $scope.new_comment.body_value.substring(0, chars);
            }
            if(newValue != undefined) $scope.new_comment.body_value = newValue;
        }
    }
});

angular.module('bazaarr').controller('FeedCtrl', function($scope, $state, ClipService, feed) {
    if ($state.includes("ebay")) {
        if(feed.data.ConditionDescription) {
            feed.data.ConditionDescriptionShort = new CutString(feed.data.ConditionDescription, 60).cut();
        } else {
            feed.data.ConditionDescriptionShort = '';
        }
        feed.data.isSinglePic = typeof feed.data.PictureURL == 'string';
        $scope.product = feed.data;
        console.log($scope.product);
    }
    else {
        $scope.feed_html = feed.data;
    }
    $scope.clip      = ClipService.clip;

    $scope.$on("clip:load", function() {
        $scope.clip = ClipService.clip;
    });
});

angular.module('bazaarr').service('FeedService', function($rootScope, HttpService, ClipService, ToastService) {
    this.load = function(nid) {
        this.clipLoad(nid);
        
        HttpService.view_url    = "source-feed/" + nid;
        HttpService.is_auth     = false;
        var promise = HttpService.get();
        
        return promise;
    };
    
    this.loadEbay = function(nid) {
        this.clipLoad(nid);
        
        HttpService.view_url    = "ebay-source/" + nid;
        HttpService.is_auth     = false;
        var promise = HttpService.get();
        promise.then(function() {}, function(reason) {
            ToastService.showMessage("danger", reason.data);
        });
        return promise;
    };
    
    this.clipLoad = function(nid) {
        if (angular.isUndefined(ClipService.clip.nid) || ClipService.clip.nid != nid) {
            ClipService.load(nid).then(function() {
                $rootScope.$broadcast("clip:load");
            });
        }
    };
});

angular.module('bazaarr').service('CommentService', function($q, HttpService) {
    this.comment = {};

    this.load = function(clip_id) {
        HttpService.view_url    = "comments";
        HttpService.params      = {"nid" : clip_id};
        return HttpService.get();
    };

    this.add = function(comment) {
        if (!comment.body_value) {
            return $q.reject({"data" : "Comment field is required!"});
        }

        HttpService.view_url    = "comment";
        HttpService.params      = comment;
        return HttpService.post();
    };

    this.save = function() {
        HttpService.view_url    = "comment/" + this.comment.cid;
        HttpService.params      = {"data" : this.comment};
        return HttpService.put();
    };

    this.delete = function() {
        HttpService.view_url    = "comment/" + this.comment.cid;
        return HttpService.delete();
    };
});

angular.module('bazaarr').controller('SingleClipCtrl',
function($scope, $state, $timeout, $ionicScrollDelegate, ClipService, ClipsService, UserService, ArrayService, SliderService) {

});

angular.module('bazaarr').service('ClipService', function($q, $ionicLoading, $state, HttpService, ClipsService, SearchService) {
    this.clip = {};
    this.load_from_server = false;
    /*this.load = function(id) {
        HttpService.view_url    = "recent";
        HttpService.params      = {"nid" : id};
        HttpService.is_auth     = false;
        return HttpService.get();
    };*/

    this.load = function(id) {

        $state.params.clipId = id;
        var clip = this.getClip();
        
        if (clip.nid && !this.load_from_server) {
            this.clip    = clip;
            return $q.when({"data": [clip]});
        }
        this.load_from_server = false;
        
        HttpService.view_url    = "recent";
        HttpService.params      = {"nid" : id};
        HttpService.is_auth     = false;
        var promise = HttpService.get();
        var that    = this;

        //TODO: promise preloader
        this.page_list = this.page_api_url;
        this.preloadImage(clip.img_large);

        promise.then(function(data){
            that.clip = ClipsService.preRenderSingle(data.data[0]);
        });

        return promise;
    };

    this.nodeLoad = function(nid) {
        HttpService.view_url = "recent";
        HttpService.params = {nid: nid};

        return HttpService.get();
    };

    this.likeClip = function(clip) {
        //$ionicLoading.show();
        HttpService.addNoCache("likes");

        HttpService.view_url = "vote/" + clip.nid;
        var promise = HttpService.put();

        promise.then(function() {
            $ionicLoading.hide();
        });

        return promise;
    };

    this.formatReclip = function(clip, bid) {
        return {
            ph_bid: bid,
            desc: clip.desc,
            nid: clip.nid,
            send_to_facebook: clip.send_to_facebook
        };
    };

    this.blockClip = function (){
        HttpService.view_url = "block";
        HttpService.params = {
            nid: this.clip.nid,
            block: typeof this.clip.bloked === 'undefined' ? 1 : this.clip.bloked
        };

        return HttpService.post();
    };

    this.loadMore = function() {
        $ionicLoading.show();
        var that = this;
        var promise = {};//ClipsService.loadMore();

        if (this.page_list === "search") {
            promise = SearchService.loadMore();
        }
        else {
            promise = ClipsService.loadMore();
        }

        promise.then(function(data) {
            ClipsService.prepare(data.data);
            if (angular.isDefined(data.data[0])) {
                that.preloadImage(data.data[0].img_large);
            }
            $ionicLoading.hide();
        });

        return promise;
    };

    this.getClip = function(index) {
        index           = index || 0;
        var preload_index   = index >= 0 ? 1 : -1;
        var clip = {};
        var page_list = this.page_list || ClipsService.page_api_url;//this.clip.page_list || ClipsService.page_api_url;
        var clips = ClipsService.clips[page_list];
        var that = this;

        angular.forEach(clips, function(value, key) {
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

    this.preloadImage = function(src) {
        var i = new Image();
        i.src = src;
        i.onload = function(){

        };
    };
});

angular.module('bazaarr').service('SliderService', function($q, $state, $ionicLoading, ClipsService, ClipService) {
    this.clips = [];
    /*
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
});
