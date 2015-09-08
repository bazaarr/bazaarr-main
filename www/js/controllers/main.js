var p = console.log.bind(console);

'use strict';

angular.module('bazaarr').controller('MainCtrl',
function($scope, $state, $rootScope, $ionicPopover, $ionicPopup,
MenuService, UserService, ToastService, ConfigService, HttpService) {
    //$scope.menus = MenuService.get();
    //$scope.title = MenuService.getTitle();

    $scope.setActive = function() {
        MenuService.setActive();
    }

    $scope.swipeLeft = function() {
        MenuService.nextMenu();

    }

    $scope.swipeRight = function() {
        MenuService.prevMenu();
    }

    $scope.isLogin = function() {
        var is_login = false;
        if (UserService.is_login) {
            //$scope.user = UserService.user;
            is_login = true;
        }

        return is_login;
    }

    $scope.logout = function() {
        UserService.logout().then(function(data) {
            HttpService.clearCache();
            UserService.clearUser();
            $state.go('login');
        }, function(reason) {
            HttpService.clearCache();
            UserService.clearUser();
            $state.go('login');
        });
    }

    $scope.addClip = function() {
        $state.go("add");
    };

    $scope.goHome = function() {
        $state.go('recent');
    };

    $scope.isSearch = function() {
        return SearchService.isSearch();
    };

    $scope.isCurrentAccount = function() {
        return $rootScope.isMyAccount() && $rootScope.isUserMenu();
    };

    $ionicPopover.fromTemplateUrl('views/menu/userAccount.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.userAccountPopover = popover;
    });

    $ionicPopover.fromTemplateUrl('views/menu/myAccount.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.myAccountPopover = popover;
    });

    $scope.openPopover = function($event) {
        if($scope.user.uid!=$state.params['userId']) {
            $scope.userAccountPopover.show($event);
        } else {
            $scope.myAccountPopover.show($event);
        }
    };
    $scope.closePopover = function() {
        if($scope.myAccountPopover){
            $scope.myAccountPopover.hide();
        }
        if($scope.userAccountPopover){
            $scope.userAccountPopover.hide();
        }
    };
    $scope.popoverLogout = function($event) {
        this.closePopover();
        this.logout();
    };
    $scope.goToEditProfile = function($event) {
        this.closePopover();
        $state.go('edit_profile')
    }
    $scope.goToEditAccount = function($event) {
        this.closePopover();
        $state.go('edit_account')
    }
    $scope.goToAboutAccount = function($event) {
        this.closePopover();
        $state.go('about-bazaarr')
    }
    $scope.goToAboutSupport = function($event) {
        this.closePopover();
        $state.go('support')
    }
    $scope.goUserMenu = function(path, params) {
        this.closePopover();
        $state.go(path, params);
    }

    $scope.goLogin = function() {
        ToastService.showMessage("danger", "Please sign in to continue");
        $state.go('login');
    }

    $scope.selectServer = function() {
        $scope.server_popup = $ionicPopup.show({
            title: "Select server",
            templateUrl: 'views/popups/select_server.html',
            scope: $scope,
            buttons: [
                { text: 'Cancel' }
            ]
        });
    }

    $scope.setServer = function(url) {
        HttpService.clearCache();
        ConfigService.setUrl(url);
        $scope.server_popup.close();
        window.location.reload();
    }

    $scope.isInstructionBarHidden = function() {
        if("standalone" in window.navigator) {
            if(!window.navigator.standalone) {
                return !!window.localStorage['isBookmarkHidden'];
            } else {
                return true;
            }
        } else {
            return !!window.localStorage['isBookmarkHidden'];
        }
    }

    $scope.hideBookmarkBar = function() {
        window.localStorage.setItem('isBookmarkHidden', true);
    }

    $scope.resetInstructions = function() {
        window.localStorage.removeItem('isBookmarkHidden');
    }

    $scope.isAndroid = function() {
        return ionic.Platform.isAndroid();
    }

    $scope.isIOS = function() {
        return ionic.Platform.isIOS();
    }

    if(!$scope.isLogin()) {
        $scope.resetInstructions();
    }
});

angular.module('bazaarr').service('ArrayService', function() {
    this.dropKeys = function(arr){
        return arr.filter(function(){return true;})
    }
    this.url_domain = function (link) {
        var a = document.createElement('a');
        a.href = link;
        return a.hostname;
    }

});
angular.module('bazaarr').service('MenuService', function($ionicScrollDelegate, $stateParams, $location, $ionicTabsDelegate) {
    this.active_id = 0,

    this.get = function() {
        return [
            {"id" : "0", "name" : "Recent", "url" : "recent",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_3"}},
            {"id" : "1", "name" : "Following", "url" : "following",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_4"}},
            {"id" : "2", "name" : "Shop", "url" : "shop",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_2"}},
            {"id" : "3", "name" : "Search", "url" : "search"},
            {"id" : "4", "name" : "My Account", "url" : "collections"},
            {"id" : "5", "name" : "Clips", "url" : "clips",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_7"}},
            {"id" : "6", "name" : "Likes", "url" : "likes",
                "api" : {"url" : "views/clip_pages", "display_id" : "page_8"}},
        ];
    },
    /*
    this.setActive = function(url) {

        if (!url) {
            url = "clips/Recent";//$location.url();
        }

        var $menus        = document.body.querySelectorAll(".top-menu a");
        var $active_menu  = document.body.querySelector(".top-menu a[ng-href='#/" + url + "']");

        var number = 0;
        for (var i = 0; i < $menus.length; i++) {
            $menus[i].className = "";
            if ($menus[i] == $active_menu) {
                number = i;
            }
        }
        $active_menu.className = $active_menu.className + " active";
        if (number < 3) {
            $ionicScrollDelegate.$getByHandle('menu').scrollTo(0, 0, true);
        }
        else {
            $ionicScrollDelegate.$getByHandle('menu').scrollTo(number * 40, 0, true);
        }
        this.active_id = number;

    },*/

    this.setActiveMenuCss = function(index) {
        var $menus      = document.body.querySelectorAll(".main-menu a");

        for (var i = 0; i < $menus.length; i++) {
            $menus[i].className = "";
        }

        document.getElementById("main-menu_" + index).className = "active";
    },

    this.setActive = function(active_id) {
        this.active_id = active_id || $ionicTabsDelegate.selectedIndex() - 1;
    },

    this.getTitle = function() {
        var title = "Recent";

        if ($stateParams) {
            var url = "";
            if ($stateParams.contentTitle) {
                title = $stateParams.contentTitle;
                url = "content/" + title;
            }
            else if ($stateParams.clipsPage) {
                title = $stateParams.clipsPage;
                url = "clips/" + title;
            }
            else {
                return title;
            }
            //this.setActive(url);
        }

        return title;
    },

    this.getActiveMenu = function(url) {
        url = url || $location.url();
        url = url.replace(/\/:(.*)/, "");
        var menus = this.get();

        for (var i = 0; i < menus.length; i++) {
            if ("/" + menus[i].url == url) {
                return menus[i];
            }
        }

        return {};//menus[this.active_id];
    },

    this.nextMenu = function() {
        var menus = this.get();

        if (this.active_id >= menus.length) {
            return false;
        }

        $location.url(menus[this.active_id + 1].url);
        this.setActive(this.active_id + 1); //menus[this.active_id + 1].url
    },

    this.prevMenu = function() {
        var menus = this.get();

        if (this.active_id <= 0) {
            return false;
        }
        $location.url(menus[this.active_id - 1].url);
        this.setActive(this.active_id - 1); //menus[this.active_id - 1].url
    }
})