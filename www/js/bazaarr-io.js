'use strict';

angular.module('bazaarr', ['ionic', 'ngCordova', 'ngCookies', 'LocalStorageModule', 'ngToast'])
//.value('server_url', "http://bazaarr.dev").value('connect_url', "mbazar")
.value('server_url', window.location.protocol + '//' + window.location.host).value('connect_url', window.location.host)//"app.icenium.com"
.value('clip', {})
/*.constant('$ionicLoadingConfig', {
  'duration': 5000,
  'template' : '<ion-spinner></ion-spinner>'
})*/
.config(function($stateProvider, $urlRouterProvider, $httpProvider, $ionicConfigProvider, ngToastProvider, $locationProvider) {
    $locationProvider.hashPrefix("!");
    //$locationProvider.html5Mode({enabled : true});
    
    $stateProvider
        .state('claim-user', {
            url: '/claim-user/:userId',
            cache: false,
            controller: 'ClaimCtrl',
            templateUrl: 'views/user/claim-user.html'
        }).state('claim', {
            url: '/claim',
            cache: false,
            controller: 'ClaimCtrl',
            templateUrl: 'views/user/claim-list.html'
        })
        .state('hashtag', {
            url: '/hashtag/:hashtagName?page',
            resolve: {
                clips: function(ClipsService, $stateParams) {
                    return ClipsService.load("hashtags", false, {hashtags: $stateParams.hashtagName});
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('recent', {
            url: '/recent?page',
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("recent", false);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('following', {
            url: '/following',
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("following", true);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('shop', {
            url: '/shop?page',
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("shop", false);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('category', {
            url: '/category/:catId?page',
            resolve: {
                clips: function(ClipsService, $stateParams) {
                    return ClipsService.load("clips-category", false, {"tid_raw" : $stateParams.catId});
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('account', {
            url: "/account/:userId",
            //cache: false,
            resolve: {
                account: function(AccountService, $stateParams) {
                    return AccountService.load($stateParams.userId);
                }
            },
            controller: 'UserCtrl',
            templateUrl: 'views/user_tabs.html'
        })
        .state('account.collections', {
            url: "/collections",
            resolve: {
                collections: function (CollectionService) {
                    return CollectionService.load2();
                }
            },
            controller: 'CollectionListCtrl',
            templateUrl: 'views/user/collections.html'
        })
        .state('account.clips', {
            url: "/clips?page",
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("clips", true);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clip/scroll-list.html'
        })
        .state('account.likes', {
            url: "/likes?page",
            resolve: {
                clips: function(ClipsService) {
                    return ClipsService.load("likes", true);
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clip/scroll-list.html'
        })
        .state('account.following-users', {
            url: "/following-users",
            resolve: {
                follows: function(FollowService) {
                    return FollowService.loadFollowing();
                }
            },
            controller: 'FollowCtrl',
            templateUrl: 'views/user/follow.html'
        })
        .state('account.following-collections', {
            url: "/following-collections",
            resolve: {
                collections: function(FollowService) {
                    return FollowService.loadCollections();
                }
            },
            controller: 'CollectionListCtrl',
            templateUrl: 'views/user/collections.html'
        })
        .state('account.followers', {
            url: "/followers",
            resolve: {
                follows: function(FollowService) {
                    return FollowService.loadFollowers();
                }
            },
            controller: 'FollowCtrl',
            templateUrl: 'views/user/follow.html'
        })
        .state('account.contact', {
            url: "/contact",
            controller: 'ContactCtrl',
            templateUrl: 'views/user/contact.html'
        })
        .state('account.about', {
            url: "/about",
            controller: 'AboutCtrl',
            templateUrl: 'views/user/about.html'
        })
        .state('collection', {
            url: '/collection/:colId',
            cache: false,
            resolve: {
                collection: function(CollectionService, $stateParams) {
                    return CollectionService.singleLoad($stateParams.colId);
                },
                collection_counters: function(CollectionService, $stateParams) {
                    return CollectionService.getCounters($stateParams.colId);
                }
            },
            controller: 'CollectionCoverCtrl',
            templateUrl: 'views/collection/cover.html'
        })
        .state('login', {
            url : '/login',
            cache: false,
            controller : 'LoginCtrl',
            templateUrl: 'views/login.html'
        })
        .state('add', {
            url: "/add",
            cache: false,
            controller : 'AddClipCtrl',
            templateUrl: 'views/clip/add.html'
        })
        .state('edit-clip', {
            url: "/edit-clip/:clipId",
            cache : false,
            controller : 'AddClipCtrl',
            templateUrl: 'views/clip/add.html'
        })
        .state('reclip', {
            url: "/reclip/:clipId",
            cache: false,
            controller : 'AddClipCtrl',
            templateUrl: 'views/clip/reclip.html'
        })
        .state('edit_profile', {
            url: "/edit_profile",
            controller : 'ProfileCtrl',
            templateUrl: 'views/user/edit-profile.html'
        })
        .state('edit_account', {
            url: "/edit_account",
            controller : 'ProfileCtrl',
            templateUrl: 'views/user/account-settings.html'
        })
        .state('clip', {
            url: "/clip/:clipId",
            cache: false,
            controller : "ClipCtrl",
            resolve: {
                clip: function(ClipService, $stateParams) {
                    return ClipService.load($stateParams.clipId);
                }
            },
            templateUrl: 'views/clip/clip-view.html'
        })
        .state('feed', {
            url: "/feed/:clipId",
            controller : "FeedCtrl",
            resolve: {
                feed: function(FeedService, $stateParams) {
                    return FeedService.load($stateParams.clipId);
                }
            },
            templateUrl: 'views/clip/feed.html'
        })
        .state('clip-full', {
            url: "/clip/:clipId/full",
            cache: false,
            controller : "ClipCtrl",
            resolve: {
                clip: function(ClipService, $stateParams) {
                    return ClipService.load($stateParams.clipId);
                }
            },
            templateUrl: 'views/clip/clip-full.html'
        })
        .state('ebay', {
            url: "/ebay/:clipId",
            controller : "FeedCtrl",
            resolve: {
                feed: function(FeedService, $stateParams) {
                    return FeedService.loadEbay($stateParams.clipId);
                }
            },
            templateUrl: 'views/clip/ebay.html'
        })
        .state('search', {
            url: '/search/:query',
            controller: 'SearchCtrl',
            resolve: {
                search: function(SearchService) {
                    return SearchService.init();
                }
            },
            templateUrl: 'views/search-new.html'
        })
        .state('search-refine', {
            url: '/search-refine',
            controller: 'SearchCtrl',
            templateUrl: 'views/search-refine.html'
        })
        .state('search-users', {
            url: '/search-users/:query',
            controller: 'SearchCtrl',
            templateUrl: 'views/search-users.html'
        })
        .state('search-tags', {
            url: '/search-tags/:query',
            controller: 'SearchCtrl',
            templateUrl: 'views/search-tags.html'
        })
        .state('search-collections', {
            url: '/search-collections/:query',
            controller: 'SearchCtrl',
            templateUrl: 'views/search-collections.html'
        })
        .state('search-clips', {
            url : '/search-clips/:query',
            resolve: {
                clips: function(SearchService) {
                    return SearchService.load();
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('add-collection', {
            url: '/add-collection/:action/:clipId',
            //cache: false,
            params: {
                action: 'account',
                clipId: ''
            },
            resolve: {
                collection: function() {
                    return {};
                }
            },
            controller: 'CollectionCtrl',
            templateUrl: 'views/collection/add.html'
        })
        .state('edit-collection', {
            url : '/edit-collection/:collectionId',
            resolve: {
                collection: function(CollectionService, $stateParams) {
                    return CollectionService.singleLoad($stateParams.collectionId);
                }
            },
            controller: 'CollectionCtrl',
            templateUrl: 'views/collection/add.html'
        })
        .state('comments', {
            url : '/comments/:clipId',
            resolve: {
                comments: function(CommentService, $stateParams) {
                    return CommentService.load($stateParams.clipId);
                },
                reclip_users: function(UserListService, $stateParams) {
                    return UserListService.getReclips($stateParams.clipId);
                },
                like_users: function(UserListService, $stateParams) {
                    return UserListService.getLikes($stateParams.clipId);
                }
            },
            controller: 'CommentCtrl',
            templateUrl: 'views/clip/comments.html'
        })
        .state('registration', {
            url : '/registration',
            controller: 'LoginCtrl',
            templateUrl: 'views/user/registration.html'
        })
        .state('contact', {
            url : '/contact/:userId',
            resolve: {
                account: function(AccountService, $stateParams) {
                    return AccountService.load($stateParams.userId);
                }
            },
            controller: 'ContactCtrl'
        })
        .state('shared', {
            url : '/shared/:collectionId',
            cache: false,
            controller: 'CollectionCtrl',
            resolve: {
                collection: function(CollectionService, $stateParams) {
                    return [CollectionService.tmp_collection];
                }
            },
            templateUrl: 'views/collection/shared.html',
        })
        .state('support', {
            url : '/support',
            controller: 'AboutCtrl',
            templateUrl: 'views/support.html',
        })
        .state('about-bazaarr', {
            url : '/about-bazaarr',
            controller: 'AboutCtrl',
            templateUrl: 'views/about-bazaarr.html',
        })
        .state('forgot-password', {
            url : '/forgot-password',
            cache: false,
            controller: 'ForgotPasswordCtrl',
            templateUrl: 'views/user/forgot-password.html',
        })
        .state('reset-password', {
            url : '/reset-password/:userId/:timestamp/:hash',
            cache: false,
            controller: 'ResetPasswordCtrl'
        })
        .state('email-notification', {
            url : '/email-notification',
            controller: 'EmailNotificationCtrl',
            cache: false,
            /*resolve: {
                notifications: function(EmailNotificationService) {
                    return EmailNotificationService.load();
                }
            },*/
            templateUrl: 'views/user/email-notification.html'
        })
        .state('login-link', {
            url : '/login-link/:hashLogin/:event',
            controller: 'LoginLinkCtrl'
        })
        .state('collection-view', {
            url: '/collection-view/:colId?page',
            resolve: {
                clips: function(ClipsService, $stateParams) {
                    return ClipsService.load("collection_clips", false, {"bid" : $stateParams.colId});
                }
            },
            controller: 'ClipsCtrl',
            templateUrl: 'views/clips.html'
        })
        .state('collection-likes', {
            url: '/collection-likes/:colId',
            resolve: {
                users: function(UserListService, $stateParams) {
                    return UserListService.loadCollectionLikes($stateParams.colId);
                }
            },
            controller: 'UserListCtrl',
            templateUrl: 'views/user/list.html'
        })
        .state('collection-reclips', {
            url: '/collection-reclips/:colId',
            resolve: {
                users: function(UserListService, $stateParams) {
                    return UserListService.loadCollectionReclips($stateParams.colId);
                }
            },
            controller: 'UserListCtrl',
            templateUrl: 'views/user/list.html'
        })
        .state('collection-follows', {
            url: '/collection-follows/:colId',
            resolve: {
                users: function(UserListService, $stateParams) {
                    return UserListService.loadCollectionFollows($stateParams.colId);
                }
            },
            controller: 'UserListCtrl',
            templateUrl: 'views/user/list.html'
        })
        .state('intro', {
            url: '/intro',
            templateUrl: 'views/intro.html'
        })
        .state('get-app', {
            url: '/get-app',
            templateUrl: 'views/get-app.html'
        })
        .state('clip-reclips', {
            url: '/clip-reclips/:clipId',
            resolve: {
                users: function(UserListService, $stateParams) {
                    return UserListService.getReclips($stateParams.clipId);
                }
            },
            controller: 'UserListCtrl',
            templateUrl: 'views/user/list.html'
        })
        .state('clip-likes', {
            url: '/clip-likes/:clipId',
            resolve: {
                users: function(UserListService, $stateParams) {
                    return UserListService.getLikes($stateParams.clipId);
                }
            },
            controller: 'UserListCtrl',
            templateUrl: 'views/user/list.html'
        })
        .state('oauthcallback', {
            url: '/oauthcallback',
            controller: 'OauthcallbackCtrl'
        })
        .state('logoutcallback', {
            url: '/logoutcallback',
            controller: 'LogoutcallbackCtrl'
        })
        .state('maintenance', {
            url: '/maintenance',
            templateUrl: 'views/maintenance.html'
        })
        .state('download', {
            url: '/download',
            templateUrl: 'views/download.html'
        })
        ;
    $urlRouterProvider.otherwise('/recent');

    $httpProvider.defaults.withCredentials = true;
    
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;

    //Remove the header used to identify ajax call  that would prevent CORS from working
    delete $httpProvider.defaults.headers.common['X-Requested-With'];

    $ionicConfigProvider.views.maxCache(20);
    $ionicConfigProvider.views.forwardCache(true);
    //$ionicConfigProvider.views.transition('ios');

    $ionicConfigProvider.tabs.position('bottom');

    $ionicConfigProvider.navBar.positionPrimaryButtons('left');
    $ionicConfigProvider.navBar.alignTitle('center');

    if (ionic.Platform.isWebView() && ionic.Platform.isAndroid() && ionic.Platform.version() > 4.3) {
        $ionicConfigProvider.scrolling.jsScrolling(false);
    }

    $ionicConfigProvider.views.swipeBackEnabled(false);

    //rewrite ionic transition to swap clips from top to bottom
    $ionicConfigProvider.transitions.views.ios = function(enteringEle, leavingEle, direction, shouldAnimate) {
        function setStyles(ele, opacity, x, boxShadowOpacity, direction) {
            var css = {};
            css[ionic.CSS.TRANSITION_DURATION] = d.shouldAnimate ? '' : 0;
            css.opacity = opacity;
            if (boxShadowOpacity > -1) {
                css.boxShadow = '0 0 10px rgba(0,0,0,' + (d.shouldAnimate ? boxShadowOpacity * 0.45 : 0.3) + ')';
            }
            if (direction === "vertical") {
                css[ionic.CSS.TRANSFORM] = 'translate3d(0,' + x + '%,0)';
            }
            else {
                css[ionic.CSS.TRANSFORM] = 'translate3d(' + x + '%,0,0)';
            }
            ionic.DomUtil.cachedStyles(ele, css);
        }
        
        var d = {
            run: function(step) {
                if (direction == 'forward') {
                    setStyles(enteringEle, 1, (1 - step) * 99, 1 - step); // starting at 98% prevents a flicker
                    setStyles(leavingEle, (1 - 0.1 * step), step * -33, -1);
                
                } else if (direction == 'back') {
                    setStyles(enteringEle, (1 - 0.1 * (1 - step)), (1 - step) * -33, -1);
                    setStyles(leavingEle, 1, step * 100, 1 - step);

                } else if (direction == 'up') {
                    setStyles(enteringEle, 1, (1 - step) * 99, 1 - step, "vertical");
                    setStyles(leavingEle, (1 - 0.1 * step), step * -99, -1, "vertical");

                } else if (direction == 'down') {
                    setStyles(enteringEle, (1 - 0.1 * (1 - step)), (1 - step) * -99, -1, "vertical");
                    setStyles(leavingEle, 1, step * 100, 1 - step, "vertical");

                } else {
                    // swap, enter, exit
                    setStyles(enteringEle, 1, 0, -1);
                    setStyles(leavingEle, 0, 0, -1);
                }
            },
            shouldAnimate: shouldAnimate && (direction == 'forward' || direction == 'back' || direction == 'up' || direction == 'down')
        };

        return d;
    };
    
    $ionicConfigProvider.transitions.views.android = function(enteringEle, leavingEle, direction, shouldAnimate) {
        shouldAnimate = shouldAnimate && (direction == 'forward' || direction == 'back' || direction == 'up' || direction == 'down');

        function setStyles(ele, x, direction) {
            var css = {};
            css[ionic.CSS.TRANSITION_DURATION] = d.shouldAnimate ? '' : 0;
            if (direction === "vertical") {
                css[ionic.CSS.TRANSFORM] = 'translate3d(0,' + x + '%,0)';
            }
            else {
                css[ionic.CSS.TRANSFORM] = 'translate3d(' + x + '%,0,0)';
            }
            ionic.DomUtil.cachedStyles(ele, css);
        }

        var d = {
            run: function(step) {
                if (direction == 'forward') {
                    setStyles(enteringEle, (1 - step) * 99);
                    setStyles(leavingEle, step * -100);

                } else if (direction == 'back') {
                    setStyles(enteringEle, (1 - step) * -100);
                    setStyles(leavingEle, step * 100);
                
                } else if (direction == 'up') {
                    setStyles(enteringEle, (1 - step) * 99, "vertical");
                    setStyles(leavingEle, step * -100, "vertical");

                } else if (direction == 'down') {
                    setStyles(enteringEle, (1 - step) * -100, "vertical");
                    setStyles(leavingEle, step * 100, "vertical");
                
                } else {
                    // swap, enter, exit
                    setStyles(enteringEle, 0);
                    setStyles(leavingEle, 0);
                }
            },
            shouldAnimate: shouldAnimate
        };

        return d;
    };

    ngToastProvider.configure({
        verticalPosition: 'middle',
        horizontalPosition: 'center',
        maxNumber: 1
    });

})
.run(function($rootScope, $location, $state, $ionicScrollDelegate, $ionicViewSwitcher, $cookies, 
$cordovaInAppBrowser, $cordovaStatusbar, $cordovaAppVersion, localStorageService, DeviceAdapterService, MenuService, 
UserService, AccountService, CollectionService, ConfigService, HttpService, ClipsService, StateService, MetaService) {
    $rootScope.is_app = false;
    document.addEventListener("deviceready", function() {
        DeviceAdapterService.is_ready = false;
        $rootScope.is_app = false;
/*
        $cordovaStatusbar.overlaysWebView(true);
        $cordovaStatusbar.style(1);

        $cordovaAppVersion.getAppVersion().then(function (version) {
            var current_version = version;
            var version = localStorageService.get("version");
            if (current_version !== version) {
                UserService.logout().then(function(data) {
                    HttpService.clearCache();
                    UserService.clearUser();
                }, function(reason) {
                    HttpService.clearCache();
                    UserService.clearUser();
                });
            }
            localStorageService.set("version", current_version);
        });
*/
    }, false);
    
    $rootScope.config = {
        screenHeight : window.innerHeight - 100
    };

    $rootScope.backState = [];
    //$rootScope.backEvent = false;

    $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){
        var active_menu = MenuService.getActiveMenu(toState.url);

        var index = -1;
        if (!!active_menu === true) {
            index = active_menu.id;
        }

        $rootScope.active          = [];
        $rootScope.active[index]   = "active";

        $ionicScrollDelegate.resize();

        /*
         * if next state equals back state, remove back state from history, to return to previous level #BA-1622
         */
        if ($rootScope.backState.length) {
            var last_state = $rootScope.backState[$rootScope.backState.length - 1];
            if (angular.isDefined(last_state.params) && angular.isDefined(last_state.params.colId) 
                    && last_state.state === toState.name && last_state.params.colId === toParams.colId) {
                $rootScope.backState.pop();
                $rootScope.backEvent = true;
            }
        }
        
        /*
         * if not back button event, not clip swiping, not account substate change
         * - add previous state to our own history stack
         */
        if (!$rootScope.backEvent && fromState.name && !(fromState.name === "clip" && toState.name === "clip")
                && fromState.name !== "login"
                && !(fromState.name.indexOf("account") === 0 && toState.name.indexOf("account") === 0
                    && fromParams.userId === toParams.userId)) {
            $rootScope.backState.push({'state' : fromState.name, 'params' : fromParams});
        }
        
        /* add our own history stack to localstorage, for enable history after browser reload */
        if (fromState.name && $rootScope.backState.length) {
            localStorageService.set("backState", $rootScope.backState);
        }
        $rootScope.backEvent = false;
        
        MetaService.setDefault();
    });
    
    window.addEventListener('popstate', function(e){
        
    }, false);

    $rootScope.goUserMenu = function(state) {
        $state.go(state);
    };

    $rootScope.getUserMenuActive = function(path) {
        if(typeof path === 'object') {
            for(var i = 0; i < path.length; i++) {
                if ($state.includes("account." + path[i])) {
                    return "active";
                }
            }
        } else {
            if ($state.includes("account." + path)) { // $location.path().substr(1) === path
                return "active";
            }
        }

        return "";
    };

    $rootScope.isUserMenu = function() {
        var path = $location.path().substr(1);

        if ($state.includes("collections") || path === "clips" || path === "likes") {
            return true;
        }

        return false;
    };

    $rootScope.back = function(direction) {
        direction = direction || "back";

        $ionicViewSwitcher.nextDirection(direction);
        $rootScope.backEvent = true;

        if (!$rootScope.backState.length) {
            $rootScope.backState = localStorageService.get("backState");
        }
        
        if ($rootScope.backState.length) {
            var back_state = $rootScope.backState.pop();

            if (back_state.state) {
                $state.go(back_state.state, back_state.params);
            } 
            else {
                $state.go("recent");
                //window.history.back();
            }
        }
        else {
            $state.go("recent");
            //window.history.back();
        }
    };

    $rootScope.backTwice = function() {
        window.history.go(-2);
    };

    $rootScope.isMyAccount = function() {
        if (!$rootScope.isLogin()) {
            return false;
        }

        return AccountService.getAccountId() === UserService.user.uid ? true : false;
    };

    $rootScope.isLogin = function() {
        if (!Object.keys(UserService.user).length) {
            return false;
        }

        return true;
    };

    $rootScope.openInApp = function(url, self, is_target) {
        if (!url) {
            return false;
        }

        if("standalone" in window.navigator && window.navigator.standalone) {
            var a = document.createElement('a');
            a.setAttribute("href", url);
            a.setAttribute("target", "_blank");

            var dispatch = document.createEvent("HTMLEvents");
            dispatch.initEvent("click", true, true);
            a.dispatchEvent(dispatch);
            return false;
        }

        var target = is_target ? "_system" : "_blank";

        var url = self ? ConfigService.server_url() + '/' + url : url;
        var options = DeviceAdapterService.getInAppBrowserConfig();
        if (!DeviceAdapterService.is_ready) {
            options.menubar = "yes";
            options.toolbar = "yes";
            if (window) {
                window.open(url, target, options);
            }
            return false;
        }

        $cordovaInAppBrowser.open(url, target, options)
        .then(function(event) {
            // success
        })
        .catch(function(event) {
            // error
        });
    };

    $rootScope.clearClipPager = function() {
        ClipsService.pager = {};
    }
    
    //remove Ionic listener, which update the head title
    $rootScope.$$listeners['$ionicView.afterEnter'] = [];

    //window.onresize = function (event) {
    window.addEventListener("resize", function() {
        $rootScope.$broadcast("orientation:change");
        $ionicScrollDelegate.resize();
    }, false);

    $rootScope.$state       = $state;
    $rootScope.StateService = StateService;

    var session = localStorageService.get("session");

    if (session) {
        UserService.is_login    = true;
        UserService.user        = session.user;
        UserService.token       = session.token;
        CollectionService.user_collections  = session.collections;

        $cookies[session.session_name]    = session.sessid;
    }

    if (UserService.is_login) {
        $rootScope.user     = UserService.user;

        UserService.getToken().then(function(data) {
            UserService.token = data.data;
        });
    }
})

/*
 * #BA-1551 To fix scrolling inside comment field
 */
.directive('textarea', function(){
    return {
        restrict: 'E',
        scope: {
            'noIonic': '='
        },
        link: function(scope, element, attr){
            if(scope.noIonic){
                element.bind('touchend  touchmove touchstart', function(e){
                    e.stopPropagation();
                });
            }
        }
    }
})

angular.module('bazaarr').service('ConfigService', function(DeviceAdapterService, localStorageService) {
    this.url                = "https://www.bazaarr.org";
    this.site_name          = "Bazaarr";
    this.title_keywords     = "Pakistani, Indian & Ethnic Fashion - Ethnic Fashion";
    this.meta_description   = "Bazaarr is a global fashion exchange encouraging users to browse and showcase style collections. Ethnic fashion from the world. Indian, Pakistani fashion etc.";

    this.server_url = function(){
        if(DeviceAdapterService.is_ready || "file:" == window.location.protocol || window.location.host.match(/bazaarr/g) == null){
            return localStorageService.get("server_url") || this.url;
        }

        return this.website_url();
    };

    this.connect_url = function(){
        return window.location.host;
    };
    
    this.website_url = function() {
        var host    = window.location.host.replace("m\.", "");
        var prehost = "";
        if (host.indexOf(".dev") === -1) {
            prehost = "www.";
        }
        return window.location.protocol + '//' + prehost + host;
    };

    this.setUrl = function(url){
        localStorageService.set("server_url", url);
        this.url = url;
    };
});

angular.module('bazaarr').service('MetaService', function($rootScope, $location, ConfigService, AccountService) {
    this.head               = {};
    this.head.title         = "";
    this.head.description   = "";
    this.head.prev_href     = "";
    this.head.next_href     = "";
    this.head.canonical_url = "";
    
    this.seo_cur_page   = 0;
    
    this.set = function(view, type, params, page) {
        if (angular.isUndefined(this[view])) {
            return false;
        }
        
        var result = this[view](type, params, page);
        $rootScope.head = this.head;
        return result;
    };
    
    this.setDefault = function() {
        this.head           = {};
        this.head.title     = ConfigService.site_name + " | " + ConfigService.title_keywords;
        $rootScope.head     = this.head;
    };
    
    this.setTitle = function(title) {
        title = title ? title + " | " : "";
        this.head.title          = title + ConfigService.site_name + " | " + ConfigService.title_keywords;
    };
    
    this.setDescription = function(description) {
        description = description || ConfigService.meta_description;
        this.head.description = description;
    };
    
    this.setCanonicalUrl = function(path) {
        path = path || "";
        this.head.canonical_url = ConfigService.website_url() + "/" + path;
    }
    
    this.login = function() {
        this.setTitle("Sign In");
        return true;
    };
    
    this.search = function() {
        this.setTitle("Search");
        this.setDescription("Search for fashion on Bazaarr");
        this.setCanonicalUrl("search");
        return true;
    };
    
    this.clip = function(type, params, page) {
        this.setTitle(params.description + " - Clip " + params.nid);
        this.setDescription(params.description + " - Clip " + params.nid);
        this.setCanonicalUrl("clip/" + params.nid);
        return true;
    };
    
    this.user = function(type, params) {
        params.about = params.about || params.name + " on " + ConfigService.site_name;
        this.setTitle(params.name);
        this.setDescription(params.about);
        this.setCanonicalUrl("user/" + params.name);
        return true;
    };
    
    this.following = function(type, params) {
        this.setTitle(params.name + " following");
        this.setDescription("Followed by " + params.name);
        this.setCanonicalUrl("user/" + params.name + "/following");
        return true;
    };
    
    this.followers = function(type, params) {
        this.setTitle(params.name + " followers");
        this.setDescription("Followers of " + params.name);
        this.setCanonicalUrl("user/" + params.name + "/followers");
        return true;
    };
    
    this.clips = function(type, params, page) {
        // Add prev and next links for SEO
        if (type !== "following") {
            this.seo_cur_page  = parseInt($location.search().page) || 0;
            var prev_page = this.seo_cur_page === 0 ? 0 : this.seo_cur_page - 1;
            var next_page = this.seo_cur_page + 1;
            var page_name = params.account_page ? "account/" + AccountService.getAccountId() + "/" + type : type;
            
            this.head.prev_href = this.seo_cur_page ? "#!/" + page_name : "";
            this.head.prev_href = prev_page ? this.head.prev_href + "?page=" + prev_page : this.head.prev_href;
            
            this.head.next_href = next_page ? "#!/" + page_name + "?page=" + next_page : "";
        }
        
        if (angular.isUndefined(this.clips[type])) {
            return false;
        }
        
        return this.clips[type](this, params, page);
    };
    
    this.clips.recent = function(that, params, page) {
        that.setTitle();
        that.setDescription();
        that.setCanonicalUrl();
        return true;
    };
    
    this.clips.shop = function(that, params, page) {
        that.setTitle("Shop");
        that.setDescription("Shop for fashion items");
        that.setCanonicalUrl("shop");
        return true;
    };
    
    this.clips.hashtag = function(that, params, page) {
        that.setTitle("Viewing: " + params.name);
        that.setCanonicalUrl("hashtags/" + params.name);
        return true;
    };
    
    this.clips.clips = function(that, params, page) {
        that.setTitle(params.name + " clips");
        that.setDescription("Clips that the " + params.name + " clipped");
        that.setCanonicalUrl("user/" + params.name + "/clips");
        return true;
    };
    
    this.clips.likes = function(that, params, page) {
        that.setTitle(params.name + " likes");
        that.setDescription("Clips that are liked by " + params.name);
        that.setCanonicalUrl("user/" + params.name + "/likes");
        return true;
    };
    
    this.clips.collection_clips = function(that, params, page) {
        if (angular.isUndefined(params.bid)) {
            return false;
        }
        params.description = params.description || "Collection " + params.name + " on Bazaarr";
        that.setTitle("Collection " + params.name + " on Bazaarr");
        that.setDescription(params.description);
        that.setCanonicalUrl("user/" + params.name + "/collection/" + params.bid);
        return true;
    }
});

/*
 * set url redirect from outside links
 */
var handleOpenURL = function(url) {
    url = url.replace("bazaarr://", "");
    window.location.hash = "/" + url;
    //window.localStorage.setItem("external_load", url);
};

function CutString(string,limit){
    // temparary node to parse the html tags in the string
    this.tempDiv = document.createElement('div');
    this.tempDiv.id = "TempNodeForTest";
    this.tempDiv.innerHTML = string;
    // while parsing text no of characters parsed
    this.charCount = 0;
    this.limit = limit;
}

window.onresize = function() {
    var cv = document.getElementsByClassName('clip-view')[0];
    if(cv) {
        var c = document.getElementsByClassName('view-container')[0];
        if(c.clientWidth / c.clientHeight > 0.67) {
            cv.classList.add('tablet');
        } else {
            cv.classList.remove('tablet');
        }
    }
};