'use strict';
angular.module('bazaarr').controller('FollowingCtrl',
    function($scope, $rootScope, $state, $timeout, $ionicSlideBoxDelegate, $cordovaKeyboard, $ionicPopup, $cacheFactory,
             ToastService, CollectionService, ClipsService, ClipService, UserService, FollowService, AccountService, hashtags) {

        $scope.collections  = [];
        $scope.clips        = [];
        $scope.tags         = hashtags.data;
        $scope.follows      = [];

        FollowService.loadCollections().then(function(promise){
            $scope.collections = CollectionService.prepare(promise.data);
            $scope.col_width = Math.round(100 / CollectionService.getColsNumber());
        });

        FollowService.loadFollowing().then(function(promise){
            $scope.follows = promise.data;
        });

        ClipsService.load("following", true).then(function(data) {
            $scope.clips = ClipsService.prepare(data.data, "", true);
            if (data.data.length >= 10) {
                $timeout(function(){
                    $scope.is_load_more = true;
                }, 1000);
            }
            else {
                $rootScope.head.next_href = "";
            }
        });

        $scope.openCollection = function(id) {
            $state.go("collection", {colId : id});
        };

        $scope.followCollection = function(coll, type) {
            if(AccountService.account_id) {
                var send_type       = (1 === type) ? 0 : 1;

                var parent_index    = this.$parent.$parent.$parent.$parent.$index;
                var index           = this.$parent.$parent.$parent.$index;
                var bid = coll.bid;

                FollowService.followCollection(bid, send_type).then(function(data){
                    $scope.collections[parent_index][index].follow = send_type;

                    FollowService.followCollectionCallback(data.data.user_follow);
                });
            } else {
                $state.go('login');
            }
        };

        $scope.isFollowingPage = function(){
            return true;
        };

        $scope.loadMore = function() {
            //$ionicLoading.show();
            if ($scope.loading_more === true) {
                $scope.$broadcast('scroll.infiniteScrollComplete');
                return false;
            }
            $scope.loading_more = true;
            var service  = {};
            if ($state.includes("search-clips")) {
                service = SearchService.loadMore();
            }
            else {
                service = ClipsService.loadMore();
            }

            service.then(function(data) {
                if (data.data == null) {
                    $scope.is_load_more = false;
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                    $scope.loading_more = false;
                    return false;
                }

                $scope.clips = $scope.clips.concat(data.data);
                $scope.clips = ClipsService.prepare(data.data);
                $scope.onScroll();
                $timeout(function(){
                    $scope.$broadcast('scroll.infiniteScrollComplete');
                    $scope.loading_more = false;
                }, 500);

                if (data.data.length < 10) {
                    $scope.is_load_more = false;
                }
                //$ionicLoading.hide();
            }, function(reason) {
                $scope.$broadcast('scroll.infiniteScrollComplete');
                $scope.loading_more = false;
                //$ionicLoading.hide();
            });
        };

        // provide actions on clip
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

        $scope.doRefresh = function() {
            if ($state.includes("search-results")) {
                $scope.$broadcast('scroll.refreshComplete');
                return false;
            }

            if ($state.current.name.indexOf("account.") > -1) {
                AccountService.update();
            }

            //TODO: remove after prepend new clips functionality
            var $httpDefaultCache = $cacheFactory.get('$http');
            $httpDefaultCache.removeAll();
            //HttpService.addNoCache(ClipsService.page_api_url.replace(/\-\d+/gi, ""));
            ClipsService.pager[ClipsService.page_api_url] = 0;
            ClipsService.load(ClipsService.page_api_url, ClipsService.is_user_page, ClipsService.params).then(function(data) {
                $scope.clips = ClipsService.prepare(data.data, "", true);
                $scope.onScroll();
                $rootScope.$broadcast('scroll.refreshComplete');
            });
        };
        
        $scope.$on("slider:update", function() {
            //$scope.tags = {};
            $ionicSlideBoxDelegate.update();
        });
        
        $scope.onScroll = function() {
            $scope.vis_clips = $scope.clips;
        }
        $scope.onScroll();
    });