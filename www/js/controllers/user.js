'use strict';

angular.module('bazaarr').controller('ClaimCtrl', function($scope, $rootScope, $state, $ionicPopup, ClaimService, ToastService, DeviceAdapterService) {
    $scope.users    = [];
    $scope.search   = '';
    $scope.is_ready = DeviceAdapterService.is_ready;
    $scope.file     = null;
    $scope.params   = {
        claim: $state.params.userId,
        firstname: '',
        lastname: '',
        email: '',
        claim_image: 0,
        app: 1
    };

    $scope.goToClaim = function(uid, claim) {
        $state.go('claim-user', {"userId" : uid});
        return;


        if(!claim){
            $state.go('claim-user', {"userId" : uid});
            return;
        }
        $state.go('login');
    }

    $scope.searchInputKeyPress = function(e, search) {
        if (e.keyCode == 13) {
            $scope.goSearchResults(search);
        }
    }

    $scope.goSearchResults = function(search){
        ClaimService.load_users(search).then(function(data){
            $scope.users = data.data;
        });
    };

    $scope.validateClaim = function(params){
        if(params.firstname == ''){
            ToastService.showMessage('danger', 'Field Firstname is required!');
            return false;
        }
        if(params.lastname == ''){
            ToastService.showMessage('danger', 'Field Lastname is required!');
            return false;
        }
        if(params.email == ''){
            ToastService.showMessage('danger', 'Field Email is required!');
            return false;
        }

        return true;
    }

    $scope.submitClaim = function(params, claim_image){

        if(!$scope.validateClaim(params)){
            return false;
        }
        params.app = claim_image;

        ClaimService.claim(params).then(function(data){
            ToastService.showMessage("success", data.data.message);
            $state.go("account.collections", {userId : params.claim});
        },
        function(reason) {
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    }

    $scope.changedFile = function(element) {
        $scope.$apply(function($scope) {
            var f       = element.files[0],
                FR      = new FileReader();
            FR.onload   = function(e) {
                $scope.file    = e.target.result;
            };
            FR.readAsDataURL(f);
        });
    };

    $scope.openPhotoSourcePopup = function() {
        $scope.photo_source_popup = $ionicPopup.show({
            title: 'Select source',
            templateUrl: 'views/popups/photo_source.html',
            scope: $scope
        });
    };
});

angular.module('bazaarr').controller('ContactCtrl', function($scope, $state, AccountService, HttpService, ToastService) {
    $scope.contact = {
        uid: $scope.account.uid
    };

    $scope.sendMessage = function(contact){
        AccountService.contactAccount(contact).then(function(data){
            $scope.contact = {
                uid: $scope.account.uid
            };
            ToastService.showMessage("success", 'Message sent successfully!');
        },
        function(reason) {
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    }
});

angular.module('bazaarr').controller('AboutCtrl', function($scope, $timeout, $state, $sce, $ionicPlatform, AboutService, ConfigService) {
    if($state.includes('support')){

    } else {
        $scope.about_data = [];
        AboutService.loadVar('about_pages_data').then(function(data){
            if(data.data.length){
                for (var i = 0; i < data.data.length; i++) {
                    $scope.about_data.push({
                        title: data.data[i].form.item_name,
                        body: $sce.trustAsHtml(data.data[i].form.item_body.replace(/<a[^>]+>/gm, ''))
                    })
                };
            }
        });
    }

    if($scope.closePopover){
        $scope.closePopover();
    }

})

angular.module('bazaarr').directive('script', function() {
    return {
        restrict: 'E',
        scope: false,
        link: function(scope, elem, attr) {
            if (attr.type==='text/javascript-lazy') {
                var s = document.createElement("script");
                s.type = "text/javascript";
                var src = elem.attr('src');
                if(src!==undefined) {
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

angular.module('bazaarr').controller('ProfileCtrl',
function($scope, $state, $ionicPopup, $ionicLoading, $cordovaCamera,
UserService, AccountService, DeviceAdapterService, ToastService, StateService, HttpService, userPicture) {
    if (!UserService.is_login) {
        $state.go('login');
        return false;
    }

    $scope.account      = angular.copy(UserService.user);
    $scope.image_src    = $scope.account.picture;
    $scope.file         = {};
    $scope.is_ready     = DeviceAdapterService.is_ready;
    var deff_pass = {
        confirmPassword: '',
        password: '',
        mess: null,
        is_valid: false
    };
    $scope.pass         = angular.copy(deff_pass);

    $scope.checkPass  = function(pass){
        $scope.pass.is_valid = false;
        if(!pass.current_password && !UserService.user.forgot_password){
            $scope.pass.mess = 'Enter current password';
            return 'error';
        }

        if(!pass.password){
            $scope.pass.mess = 'Please set your password';
            return 'error';
        }
        if(pass.password.length < 6){
            $scope.pass.mess = 'Password is too short';
            return 'error';
        }
        if(!pass.confirmPassword){
            $scope.pass.mess = 'Please fill Confirm Password field';
            return 'error';
        }
        if(pass.password != pass.confirmPassword){
            $scope.pass.mess = 'Passwords do not match';
            return 'error';
        }

        $scope.pass.mess = "";
        $scope.pass.is_valid = true;
        return 'good';
    };

    $scope.passwordChange  = function(){
        $scope.popup = $ionicPopup.show({
            title: 'Change Password',
            templateUrl: 'views/popups/inputs/password.html',
            scope: $scope,
            cssClass: 'password',
            buttons: [
                {
                    text: '<i class="ion-close"></i>',
                    onTap: function(e){
                        $scope.pass = angular.copy(deff_pass);
                    }
                },
                {
                    text: '<i class="ion-checkmark"></i>',
                    onTap: function(e){
                        e.preventDefault();
                        if ($scope.pass.is_valid){
                            AccountService.checkCurrentPass($scope.pass.current_password).then(function() {
                                $scope.account.pass             = $scope.pass.password;
                                $scope.account.current_password = $scope.pass.current_password;
                                $scope.popup.close();
                            });
                        }
                    }
                }
            ]
        });
    };

    $scope.openPhotoPopup  = function(){
        userPicture.imgPopup($scope);
    };

    $scope.closeImagePopup  = function(){
        userPicture.closeImagePopup($scope);
    };

    $scope.saveAccount  = function(account, file){
        if(UserService.user.forgot_password && $scope.pass.password.length == 0){
            ToastService.showMessage("danger", "Please set your password!");
            return;
        }
        $scope.account.forgot_password = 0;

        $ionicLoading.show();

        saveAccount(account);
    };

    function saveAccount(account, file){
        AccountService.saveAccount(account, file).then(function(data){
            //$scope.suc_mess = "Profile saved successfully!";
            ToastService.showMessage("success", "Profile saved successfully!");
            if(!angular.isUndefined(file) && file.fid){
                account.picture = file.url;
            }
            HttpService.clearCache();

            delete account.forgot_password;
            delete account.pass_reset_token;
            delete account.pass;

            UserService.setUser(account);
            if(AccountService.account.uid == UserService.user.uid){
                AccountService.account = account;
            }

            StateService.go('account.collections', {"userId": account.uid}, 'profile:update');

            $ionicLoading.hide();
            $scope.pass = angular.copy(deff_pass);
        },
        function(reason) {
            $ionicLoading.hide();
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    }

    $scope.openPhotoSourcePopup = function() {
        userPicture.openPhotoSourcePopup($scope, DeviceAdapterService.is_ready);
    };

    $scope.changedFile = function(element) {
        userPicture.changedFile(element, $scope);
    };

    $scope.addPhoto  = function(type){
        userPicture.addPhoto(type, $scope, DeviceAdapterService);
    };
});

angular.module('bazaarr').controller('UserCtrl',
function($scope, $state, $rootScope, $timeout, AccountService, FollowService, ToastService, userPicture, DeviceAdapterService) {
    /*if (!UserService.is_login) {
        $state.go('login');
        return false;
    }*/

    $scope.account = AccountService.account;

    //AccountService.account = account.data;//!!account.data === true ? account.data : account;

    $scope.$on('profile:update', function(event) {
        if(AccountService.account.about && AccountService.account.about.length > 150) {
            var obj = new CutString(AccountService.account.about, 150);
            AccountService.account.about_short = obj.cut();
            if(AccountService.account.about_short.length - AccountService.account.about_short.lastIndexOf('...') == 3) {
                AccountService.account.about_short = AccountService.account.about_short.substr(0, AccountService.account.about_short.lastIndexOf ('...')) + ' <span class="expand">(More...)</span>'
            }
        } else {
            AccountService.account.about_short = AccountService.account.about;
        }
        $scope.account = AccountService.account;
    });

    var follow_process = false;
    $scope.followUser = function(is_follow) {
        if (follow_process) {
            return false;
        }
        follow_process = true;
        var type = (1 == is_follow) ? 0 : 1;
        FollowService.followUser(AccountService.getAccountId(), type).then(function(data) {
            $scope.account.is_follow = type;
            FollowService.followElseUserCallback(type);

            if(data.data.message){
                ToastService.showMessage("success", data.data.message);
            }
            follow_process = false;
            // p(FollowService.colls);
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
    }


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

    $scope.openPhotoPopup  = function(){
        userPicture.imgPopup($scope);
    };

    $scope.openPhotoSourcePopup = function() {
        userPicture.openPhotoSourcePopup($scope, DeviceAdapterService.is_ready);
    };

    $scope.changedFile = function(element) {
        userPicture.changedFile(element, $scope);
    };

    $scope.closeImagePopup  = function(){
        userPicture.closeImagePopup($scope);
    };

    $scope.addPhoto  = function(type){
        userPicture.addPhoto(type, $scope, DeviceAdapterService);
    };

    $scope.toggleUserDesc = function(open) {
        if($scope.account.about.length > 150) {
            $scope.isDescOpen = open;
        }
    };

    $scope.usernameResize = function() {
        var container = document.getElementsByClassName("user-header");
        if (container.length > 0) {
            container = container[1] ? container[1] : container[0];
            var name = container.getElementsByClassName("uname")[0];
            var containerChildren = container.children;
            var containerWidth = container.offsetWidth;
            var fontSize = 22;
            while (fontSize > 8) {
                fontSize--;
                name.style.fontSize = fontSize + 'px';
                var widthSumm = 0;
                for (var i = 0; i < containerChildren.length; i++) {
                    widthSumm += containerChildren[i].offsetWidth + 2;
                }
                if (containerWidth > widthSumm) {
                    break;
                }
            }
        }
    };

    $scope.onScroll = function() {
        $rootScope.$broadcast("scroll");
    };

    $scope.$on('orientation:change', function(event) {
        $scope.usernameResize();
    });

    if($state.includes("account")) {
        $timeout(function(){
            $scope.usernameResize();
        })
    }
});

angular.module('bazaarr').controller('FollowCtrl',
function($scope, $rootScope, $state, FollowService, AccountService, CollectionService, HttpService, follows) {
    /*$scope.follows = follows.data.map(function(fol) {
        fol.type = FollowService.type;
        return fol;
    });*/

    $scope.follows = follows.data;

    var follow_process = false;
    $scope.followUser = function(uid, type, index) {
        if (follow_process) {
            return false;
        }
        follow_process = true;
        FollowService.followUser(uid, type).then(function(){
            $scope.follows[index].type = (0 === type) ? 1 : 0;
            FollowService.followUserCallback(type);
            //AccountService.updateCounts(); //UserService.updateCounts('following_count', type);
            follow_process = false;
        });
    }

    $scope.goFollowing = function() {

    }

    $scope.$parent.doRefresh = function() {
        var promise = {};
        if ($state.includes("account.following-users")) {
            HttpService.addNoCache("following-users");
            promise = FollowService.loadFollowing();
        }
        else if ($state.includes("account.followers")) {
            HttpService.addNoCache("followed-users");
            promise = FollowService.loadFollowers();
        }
        else {
            return false;
        }

        AccountService.update();

        promise.then(function(data) {
            $scope.follows = data.data;

            $rootScope.$broadcast('scroll.refreshComplete');
        });
    };
});

angular.module('bazaarr').controller('EmailNotificationCtrl',
function($scope, $state, $ionicPopup, $timeout, EmailNotificationService, UserService, ToastService) {
    if (!UserService.is_login) {
        UserService.post_login.redirect     = "email-notification";
        ToastService.showMessage("danger", "Please sign in to continue");

        $state.go('login');
        return false;
    }

    $scope.notifications    = {};

    $scope.mail_speed_name = "Once a day at most";

    $scope.selectMailSpeed = function() {
        $scope.mail_speed_popup = $ionicPopup.show({
            title: "Select server",
            templateUrl: 'views/popups/inputs/select-mail_speed.html',
            scope: $scope,
            buttons: [
                { text: 'Cancel' }
            ]
        });
    }

    $scope.setMailSpeed = function(name, value) {
        $scope.mail_speed_name          = name;
        $scope.notifications.mail_speed = value;
        $scope.mail_speed_popup.close();
        this.saveSettings($scope.notifications);
    }
    var tpromise = null;
    $scope.saveSettings = function(notifs) {
        if(tpromise){
            $timeout.cancel(tpromise);
        }
        tpromise = $timeout(function(){
            EmailNotificationService.saveNotifs(notifs, UserService.user.uid).then(function(data){
                ToastService.showMessage("success", "Notification settings successfully saved!");
            });
        }, 1000);
    }

    EmailNotificationService.loadSubscribes(UserService.user.uid).then(function(data){
        $scope.notifications = data.data;
        if($scope.notifications.mail_speed == 'immediate'){
            $scope.mail_speed_name = 'When they happen';
        }
    });
});

angular.module('bazaarr').controller('UserListCtrl',
function($scope, users, UserListService) {
    $scope.users = users.data;
    $scope.title = UserListService.title;
});

angular.module('bazaarr').service('UserListService',
function(HttpService) {
    this.getReclips = function(nid) {
        this.title = 'Reclips';
        HttpService.view_url    = "users-recliped-clip";
        HttpService.params      = {nid: nid};
        HttpService.is_auth     = false;

        return HttpService.get();
    };

    this.getLikes = function(nid) {
        this.title = 'Likes';
        HttpService.view_url    = "users-liked-clips";
        HttpService.params      = {nid: nid};
        HttpService.is_auth     = false;

        return HttpService.get();
    };

    this.loadCollectionLikes = function(bid) {
        this.title = 'People who like collection';
        HttpService.view_url    = "collection-likes";
        HttpService.params      = {"bid" : bid}
        HttpService.is_auth     = false;

        return HttpService.get();
    };

    this.loadCollectionReclips = function(bid) {
        this.title = 'People who reclip collection';
        HttpService.view_url    = "collection-reclips";
        HttpService.params      = {"bid" : bid}
        HttpService.is_auth     = false;

        return HttpService.get();
    };

    this.loadCollectionFollows = function(bid) {
        this.title = 'People who follow collection';
        HttpService.view_url    = "collection-followed";
        HttpService.params      = {"bid" : bid}
        HttpService.is_auth     = false;

        return HttpService.get();
    };

    this.loadBrands = function() {
        HttpService.view_url    = "brands-list";
        HttpService.is_auth     = false;

        var r = HttpService.get();

        return r;
    };
});


angular.module('bazaarr').service('EmailNotificationService',
function(HttpService) {
    this.saveNotifs = function(notifs, uid){
        HttpService.view_url    = "subscribes/" + uid;
        HttpService.params = {
            data: notifs
        };
        return HttpService.put();
    }

    this.loadSubscribes = function(uid){
        HttpService.view_url    = "subscribes/" + uid;
        HttpService.cache       = false;

        return HttpService.get();
    }
});

angular.module('bazaarr').service('StateService', function($state, $rootScope, UserService) {
    this.go = function(state, params, broadcast) {
        $state.go(state, params).then(function() {
            if (broadcast) {
                $rootScope.$broadcast(broadcast);
            }
        });
    };

    this.goMyAccount = function() {
        this.goAccount(UserService.user.uid);
    };

    this.goAccount = function(uid) {
        $state.go("account.collections", {userId : uid});
    };

    this.goFeed = function(nid, is_ebay) {
        is_ebay = is_ebay || false;

        if (is_ebay) {
            $state.go("ebay", {clipId : nid});
            return true;
        }

        $state.go("feed", {clipId : nid});
    }
});

angular.module('bazaarr').service('AboutService', function($state, $rootScope, HttpService) {
    this.loadVar = function(name){
        HttpService.view_url    = "system/get_variable";
        HttpService.params      = {
            name: name
        };

        return HttpService.post();
    }
});

angular.module('bazaarr').service('ToastService', function(ngToast) {
    this.showMessage = function(type, message) {
        if (angular.isUndefined(message) || message.length === 0) {
            return false;
        }
        ngToast.create({
            className: type,
            content: message
        });
    };

    this.showDrupalFormMessage = function(type, message) {
        var toast_mess = "";
        angular.forEach(message.form_errors, function(value, key) {
            value = value.replace(/href=\"\/user\/password\"/gi, 'href="#/forgot-password"');
            toast_mess += value + "<br />";
        });
        this.showMessage(type, toast_mess);
    };
});

angular.module('bazaarr').service('RegistrationService',
function($q, HttpService, ToastService) {
    this.add = function(user) {
        if (!this.validate(user)) {
            return $q.reject({"data" : ""});
        }

        HttpService.view_url    = "user/register";
        HttpService.is_auth     = false;
        HttpService.params      = user;

        return HttpService.post();
    };

    this.validate = function(user) {
        if (angular.isUndefined(user.name)) {
            ToastService.showMessage("danger", "Please, enter your Username");
            return false;
        }
        if (user.name.length < 3) {
            ToastService.showMessage("danger", "Username should be longer than 3 characters");
            return false;
        }
        /*if (angular.isUndefined(user.mail)) {
            ToastService.showMessage("danger", "Please, enter your E-mail");
            return false;
        }*/
        var re = /^([A-Za-z0-9]{1}[\w-]*(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
        if (angular.isUndefined(user.mail) || !re.test(user.mail)) {
            ToastService.showMessage("danger", "Please, enter correct e-mail");
            return false;
        }
        if (angular.isUndefined(user.pass)) {
            ToastService.showMessage("danger", "Please, enter your Password");
            return false;
        }
        if (user.pass.length < 6) {
            ToastService.showMessage("danger", "Password should be longer than 6 characters");
            return false;
        }




        return true;
    };
});

angular.module('bazaarr').service('AccountService',
function($rootScope, $state, $timeout, $q, $ionicHistory, $ionicLoading, HttpService, UserService, ToastService) {
    this.account        = {};
    this.account_id     = 0;
    this.is_my_account  = true;

    this.counts_update  = false;

    this.fileLoad = function(fid) {
        HttpService.view_url    = "file/" + fid;

        return HttpService.get();
    }

    this.contactAccount = function(contact) {
        HttpService.view_url    = "contact";
        HttpService.params      = {
            "contact": contact
        };

        return HttpService.post();
    }

    this.loadAbout = function() {

        return this.account_id || UserService.user.uid;
    };

    this.getAccountId = function() {
        return this.account_id || UserService.user.uid;
    };

    this.getAccount = function() {
        return !!this.account.uid ? this.account : UserService.user;
    };

    this.load = function(uid) {
        /*
        if ((0 === uid || (uid === this.account_id)) && !this.counts_update) {
            return this.account;
        }*/

        this.account_id     = uid;
        this.is_my_account  = false;
        if (UserService.user.uid === uid) {
            this.is_my_account  = true;
            this.counts_update  = false;
            //this.account        = UserService.user;
            //return this.account;
        }

        HttpService.view_url = "user/" + uid;
        //HttpService.view_url = "user-info";
        //HttpService.params   = {"uid" : uid};
        HttpService.is_auth  = false;
        //HttpService.cache    = false;

        var promise = HttpService.get();
        var that = this;
        promise.then(function(data) {
            that.account = data.data;
            $timeout(function() {
                $rootScope.$broadcast("profile:update");
            }, 200);
            if (that.is_my_account) {
                UserService.user    = data.data;
                $rootScope.user     = data.data;
            }
        });
        return promise;
    };

    this.saveAccount = function(account, file){
        // p(account);return
        HttpService.view_url = "user/" + account.uid;
// "pass-reset-token"
        var params = {
            "data": {
                "uid" : account.uid,
                "name" : account.name,
                "description" : account.about,
                "website" : account.website,
                "location" : account.location
            }
        };

        if(account.current_pass){
            params.data.current_pass = account.current_pass;
        }
        if(UserService.user.mail != account.mail && account.current_pass){
            params.data.mail            = account.mail;
            params.data.current_pass    = account.current_pass;
        }
        if(account.pass){
            params.data.pass            = account.pass;
            params.data.current_pass    = account.current_password;
        }
        if(file){
            params.data.picture = file.fid;
        }


        HttpService.params = params;
        if(UserService.user.forgot_password){
            HttpService._params = {
                'pass-reset-token': UserService.user.pass_reset_token
            };
        }

        return HttpService.put();
    }

    this.addFile = function(file, account) {
        if(typeof file.fid == 'undefined'){
            return false;
        }

        file.filename = "device.jpg";
        file.filepath = "public://pictures/" + file.filename;

        HttpService.view_url = "file";
        HttpService.params   = file;
        return HttpService.post();
    }

    /* don't use this */
    this.updateCounts = function() {
        this.counts_update = true;
    };

    /* use this */
    this.updateCounters = function(counter_name, type, not_my_account) {
        not_my_account = not_my_account || false;
        HttpService.addNoCache("user/" + UserService.user.uid);
        if (this.account_id == UserService.user.uid || not_my_account) {
            var counter = parseInt(this.account[counter_name]);
            this.account[counter_name] = type ? counter + 1 : counter - 1;
            $rootScope.$broadcast("profile:update");
        }
    };

    this.update = function() {
        var that = this;
        HttpService.clearViewCache();
        HttpService.addNoCache("user/" + this.getAccountId());
        this.load($state.params.userId).then(function(data) {
            that.account = data.data;
            $rootScope.$broadcast("profile:update");
        });
    };

    this.checkCurrentPass = function(password) {
        if (angular.isUndefined(password) || !password || password === "") {
            ToastService.showMessage("danger", "Please set your password!");
            return $q.reject();
        }
        HttpService.view_url = "check-password";
        HttpService.params   = {"data" : password};

        $ionicLoading.show();
        var promise = HttpService.post();
        promise.then(function() {
            $ionicLoading.hide();
        }, function(reason) {
            ToastService.showMessage("danger", reason.data[0]);
            $ionicLoading.hide();
        });

        return promise;
    };
});

angular.module('bazaarr').service('FollowService',
function($rootScope, $ionicHistory, HttpService, AccountService, CollectionService, MetaService) {
    this.params = {};
    this.type   = 0;

    this.colls = {};
    this.loadFollowing = function() {
        this.type = 0;
        HttpService.view_url = "following-users";
        HttpService.params   = {"uid" : AccountService.getAccountId()};
        HttpService.is_auth  = false;
        var promise = HttpService.get();

        return this.preRender(promise, "following");
    };

    this.loadCollections = function() {
        HttpService.view_url = "collections-followed";
        HttpService.params   = {"uid" : AccountService.getAccountId()};
        HttpService.is_auth  = false;
        return HttpService.get();
    };

    this.loadFollowers = function() {
        this.type = 1;
        HttpService.view_url = "followed-users";
        HttpService.params   = {"uid" : AccountService.getAccountId()};
        HttpService.is_auth  = false;
        var promise = HttpService.get();

        return this.preRender(promise, "followers");
    };

    this.followUser = function(uid, type) {
        HttpService.addNoCache("user/" + uid);
        HttpService.view_url = "follow/" + uid;
        HttpService.params   = {"type" : "user", "action" : type};
        return HttpService.put();
    };

    this.followCollection = function(bid, type) {
        HttpService.view_url = "follow/" + bid;
        HttpService.params   = {"type" : "collection", "action" : type};
        var promise = HttpService.put();
        promise.then(function(){
            CollectionService.updateCollectionField(bid, "followed", type, "update");
            CollectionService.updateCollectionField(bid, "count_followers", type, "increment");
            HttpService.clearHttpCache("collection-followed");
        });
        return promise;
    };

    this.followUserCallback = function(type) {
        this.clearCache();
        AccountService.updateCounters('following_count', type);
    };

    this.followElseUserCallback = function(type) {
        this.followUserCallback();

        AccountService.updateCounters('followers_count', type, true);
        $rootScope.$broadcast("collections:follow", {type : type});
    };

    this.clearCache = function() {
        HttpService.addNoCache("following-users");
        HttpService.addNoCache("followed-users");
        HttpService.addNoCache("following");
        HttpService.addNoCache("collections-followed");
        HttpService.addNoCache("get_user_collections/" + AccountService.getAccountId());
        HttpService.addNoCache("user/" + AccountService.getAccountId());
        //$ionicHistory.clearCache();
    }

    this.preRender = function(promise, page) {
        var type = this.type;

        promise.then(function(data){
            var account = AccountService.getAccount();
            MetaService.set(page, "", {"name" : account.name, "about" : account.about});

            data.data = data.data.map(function(d) {
                d.type = 1;
                if (0 === type || angular.isDefined(d.is_folowed)) {
                    d.type = 0;
                }

                return d;
            });
        });

        return promise;
    };

    this.followCollectionCallback = function(user_follow) {
        this.clearCache();
        if (user_follow === false) {
            HttpService.addNoCache("following-users");
            HttpService.addNoCache("followed-users");

            AccountService.updateCounters('following_count', 0);
        }
    };
});

angular.module('bazaarr').service('HttpService',
function($q, $http, $state, $cacheFactory, $rootScope, $ionicLoading, $ionicHistory, $cordovaNetwork,
ConfigService, UserService, DeviceAdapterService, ToastService) {
    this.view_url   = "";
    this.params     = {};
    this._params     = {};
    this.page       = 0;
    this.method     = "get";
    this.is_auth    = true;
    this.cache      = true;
    this.no_cache   = {};

    this.show_cnt   = 0;
    this.online     = true;

    this.show_loading = true;

    this.setDefault = function() {
        this.view_url   = "";
        this.params     = {};
        this.page       = 0;
        this.method     = "get";
        this.is_auth    = true;
        this.cache      = true;
    };

    this.get = function() {
        this.method = "get";
        return this.load();
    };

    this.post = function() {
        this.method = "post";
        return this.load();
    };

    this.put = function() {
        this.method = "put";
        return this.load();
    };

    this.dell = function() {
        this.method = "delete";
        return this.load();
    };

    this.delete = function() {
        return this.dell();
    };

    this.load = function() {
        var config = {};
        var api_url = "api/v1";

        if (this.is_auth) {
            config = UserService.getConfig();
            if (!config) {
                return false;
            }
            //api_url = "apiuser";
        }

        var url = ConfigService.server_url() + "/"
                + api_url + "/"
                + this.view_url + "/"
                + "?prot=" + window.location.protocol + "&dom=" + ConfigService.connect_url()
                + (this.page ? "&page=" + this.page : "")
                + (("get" === this.method && Object.keys(this.params).length) ? this.objToGet(this.params) : "")
                + ((Object.keys(this._params).length) ? this.objToGet(this._params) : "")
                ;
        url = url.replace("#", "%23");

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
            ToastService.showMessage("danger", "No Internet Connection");
        }

        if (!this.online && this.page) {
            return $q.reject({"data" : "No Internet Connection"});
        }

        switch (this.method) {
            case "get":
                dfd.resolve($http.get(url, config));
                break;
            case "post":
                dfd.resolve($http.post(url, this.params, config));
                break;
            case "put":
                dfd.resolve($http.put(url, this.params, config));
                break;
            case "delete":
                dfd.resolve($http.delete(url, config));
                break;
        }

//p(dfd.promise);
        var promise = dfd.promise;

        if ("get" == this.method && !this.page && this.online && this.show_loading) {
            $ionicLoading.show();
            this.show_cnt++;

            var that = this;
            promise.then(function() {
                if (that.show_cnt === 1) {
                    $ionicLoading.hide();
                }
                that.show_cnt--;
            }, function(reason) {
                $ionicLoading.hide();
                if (503 === reason.status) {
                    $state.go("maintenance");
                }
            });
        }

        this.setDefault();

        return promise;
    };

    this.objToGet = function(obj) {
        var str = '';
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                str += '&' + p + '=' + obj[p];
            }
        }
        return str;
    };

    this.addNoCache = function(view_url) {
        this.no_cache[view_url] = true;
    };

    this.clearCache = function() {
        var $httpDefaultCache = $cacheFactory.get('$http');
        $httpDefaultCache.removeAll();
        this.clearViewCache();
    };

    this.clearHttpCache = function() {
        var that = this;
        angular.forEach(arguments, function(value) {
            that.addNoCache(value);
        });
    };

    this.clearViewCache = function() {
        $rootScope.clearClipPager();
        $ionicHistory.clearCache();
    }
});

angular.module('bazaarr').service('UserService',
function($q, $http, $rootScope, $cookies, $cookieStore, $state, $timeout, localStorageService, ConfigService, ToastService) {
    this.is_login = false;

    this.token = "";

    this.user = {};

    this.session_name = "";

    this.post_login = {};

    this.getToken = function() {
        var dfd = $q.defer();

        dfd.resolve($http.post(ConfigService.server_url() + '/services/session/token'
                + '?prot=' + window.location.protocol + '&dom=' + ConfigService.connect_url(),
            {"uid" : this.user.uid}));
        var promise = dfd.promise;
        var that = this;
        promise.then(function(data) {
            that.token = data.data;
        }, function(reason) {

        });

        return promise;
    },

    this.setUser = function(user) {
        this.user = user;
        var session = localStorageService.get("session");
        session.user = user;
        localStorageService.set("session", session);
    };

    //set user to service & LS after login
    //redirect it to account
    this.store = function(user) {
        //this.setUser();

        $cookies[user.session_name]    = user.sessid;

        localStorageService.set("session", user);

        this.token                   = user.token;
        this.is_login                = true;
        this.user                    = user.user;
        this.session_name            = user.session_name;

        $rootScope.user = this.user;
    };

    this.loginCallback = function(data) {
        this.store(data);

        if (Object.keys(this.post_login).length) {
            $state.go(this.post_login.redirect, this.post_login.params);
            if (angular.isDefined(this.post_login.broadcast) && this.post_login.broadcast.length) {
                var broadcast = this.post_login.broadcast;
                $timeout(function(){
                    $rootScope.$broadcast(broadcast);
                }, 500)
            }
            this.post_login = {};
        }
        else {
            $state.go('account.collections', {"userId" : data.user.uid});
        }
    };

    this.isConnect = function() {
        var config = this.getConfig();
        var dfd = $q.defer();

        dfd.resolve($http.post(ConfigService.server_url() + '/api/v1/system/connect'
                + '?prot=' + window.location.protocol + '&dom=' + ConfigService.connect_url(),
            {}, config));
        return dfd.promise;
    }

    this.signIn = function(user, type) {
        if (!this.signInValidate(user, type)) {
            return $q.reject({"data" : ""});
        }

        this.clearCookies();

        type = type || "user/login";
        var config = this.getConfig();

        //user.device_id = DeviceAdapterService.getUUID();

        var dfd = $q.defer();

        dfd.resolve($http.post(ConfigService.server_url() + '/api/v1/' + type + '/'
                + '?prot=' + window.location.protocol + '&dom=' + ConfigService.connect_url(),
                user, config));

        var promise = dfd.promise;
        var that    =  this;
        promise.then(function() {
            that.getToken();
        }, function(reason) {
            ToastService.showMessage("danger", reason.data);
            that.getToken();
        });

        return promise
    },

    this.signInValidate = function(user, type) {
        if ((angular.isUndefined(user.username) || angular.isUndefined(user.password)) && type != 'social') {
            ToastService.showMessage("danger", "Please make sure that you've entered your username and password correctly");
            return false;
        }

        return true;
    };

    this.logout = function() {
        var config = this.getConfig();

        if (!config) {
            return false;
        }

        var dfd = $q.defer();

        dfd.resolve($http.post(ConfigService.server_url() + '/api/v1/user/logout/'
                + '?prot=' + window.location.protocol + '&dom=' + ConfigService.connect_url(),
            {}, config));
        return dfd.promise;
    },

    this.getConfig = function() {
        if (!this.token) {
            return false;
        }

        var credentials = this.is_login ? true : false;

        var config = {
            "headers" : {
                'Content-Type'      : 'application/json', //x-www-form-urlencoded
                'X-CSRF-Token'      : this.token
            },
            'withCredentials'   : true,//credentials,
            'crossDomain'       : true
        }

        return config;
    },

    this.clearCookies = function() {
        angular.forEach($cookies, function (v, k) {
            $cookies.remove(k);
        });
    },

    this.clearUser = function() {
        this.token       = "";
        this.is_login    = false;
        this.user        = {};
        $rootScope.user  = {};

        //$cookieStore.remove(UserService.session_name);
        this.clearCookies();
        this.session_name = "";

        localStorageService.remove("session");
    }

    this.updateCounts = function(name, value) {

        return true;

        if(typeof this.user[name] != 'undefined'){
            var val         = parseInt(value),
            old_val         = parseInt(this.user[name]);
            this.user[name] = val ? old_val + val : old_val - 1;
            this.setUser(this.user);

            return this.user[name];
        }
    }
});

angular.module('bazaarr').service('DeviceAdapterService', function($cordovaDevice, $cordovaCamera, $compile) {
    this.is_ready = false,

    this.getUUID = function() {
        return this.is_ready ? $cordovaDevice.getUUID() : "";
    },

    this.getCameraPhoto = function() {

    },

    this.getCameraOptions = function(source_type_id, camera_direction) {
        camera_direction = camera_direction || 0;
        return {
            quality: 85,
            destinationType: Camera.DestinationType.DATA_URL,
            sourceType: source_type_id,
            allowEdit: false,
            encodingType: Camera.EncodingType.JPEG,
            //targetWidth: 1000,
            //targetHeight: 1000,
            popoverOptions: CameraPopoverOptions,
            saveToPhotoAlbum: false,
            cameraDirection : camera_direction,
            correctOrientation: true
        };
    },

    this.getAndroidPushConfig = function() {
        return {
            "senderID": "708812439397"
        };
    };

    this.getInAppBrowserConfig = function() {
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
});

angular.module('bazaarr').service('userPicture',
function($timeout, $ionicLoading, $ionicPopup, $cordovaCamera, UserService, DeviceAdapterService, AccountService, ToastService, HttpService) {

    this.popup = null;

    this.imgPopup = function(scope){
        if(AccountService.account.uid != UserService.user.uid){
            return false;
        }
        scope.image_src = UserService.user.big_picture;
        this.popup = $ionicPopup.show({
            title: 'Change your picture',
            templateUrl: 'views/popups/inputs/profile-photo.html',
            scope: scope,
            cssClass: 'profile-photo',
            buttons: [
                {text: 'Cancel'},
                {text: 'Change', onTap: scope.openPhotoSourcePopup, type: 'button-positive'}
            ]
        });
    };

    this.closePopup = function(){
        if (this.popup) {
            this.popup.close();
        }
    }

    this.uploadImage = function(scope){
        $ionicLoading.show();
        AccountService.addFile(scope.file, scope.account).then(function(data){
            var file = data.data;
            scope.account.fid       = file.fid;
            AccountService.saveAccount(scope.account, file).then(function(data){
                if(!angular.isUndefined(file) && file.fid){
                    scope.account.fid = file.fid;
                    scope.account.picture = data.data.img;
                    scope.account.big_picture = data.data.img;
                    HttpService.clearCache();
                }

                if(AccountService.account.uid == UserService.user.uid){
                    AccountService.account = scope.account;
                }
                UserService.setUser(scope.account);
                $ionicLoading.hide();
                ToastService.showMessage("success", "You changed your picture!");
            });
        },
        function(reason) {
            ToastService.showMessage("danger", reason.data);
            $ionicLoading.hide();
        });
    }

    this.openPhotoSourcePopup = function(scope, is_ready) {
        this.closePopup();
        var opts = {
            title: 'Select source',
            templateUrl: 'views/popups/photo_source.html',
            scope: scope
        },
        self = this;
        if(!is_ready) {
            opts.title = 'Select Picture';
            opts.templateUrl = 'views/popups/web_photo_source.html';
            opts.buttons = [
                {
                    text: 'Select',
                    onTap: function() {
                        if(angular.isUndefined(scope.file)){
                            p('error');
                            return false;
                        }
                        scope.image_src = scope.file.file;
                        scope.file.fid = null;
                        self.uploadImage(scope);
                        self.photo_source_popup.close();
                    }
                },
                {
                    text: 'Cancel',
                    onTap: function() {
                        self.photo_source_popup.close();
                    }
                }
            ]
        }

        $timeout(function() {
            self.photo_source_popup = $ionicPopup.show(opts);
        });
    };

    this.closeImagePopup = function(scope){
        this.photo_source_popup.close();
    }

    this.setCanvasImage = function(element, _url, scope){
        if(angular.isUndefined(scope.file)){
            scope.file = {
                file: null
            };
        }
        var canvas      = document.getElementById('canvas'),
            MAX_WIDTH   = document.getElementById('canvas_wrapp').clientWidth,
            img         = new Image();

        var f           = element.files[0],
            url         = window.URL || window.webkitURL,
            src         = url.createObjectURL(f);

        var FR= new FileReader();
        FR.onload = function(e) {
            scope.file.file    = e.target.result;
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

    this.changedFile = function(element, scope) {
        var p = this;
        scope.$apply(function(scope) {
            p.setCanvasImage(element, null, scope);
        });
    };

    this.addPhoto = function(source_type_id, scope, Device){
        this.closeImagePopup(scope);
        if (!Device.is_ready) {
            return false;
        }
        var p = this;
        $cordovaCamera.getPicture(Device.getCameraOptions(source_type_id, 1)).then(function(imageData) {
            if(angular.isUndefined(scope.file)){
                scope.file = {};
            }
            scope.file.file = imageData;
            scope.file.fid  = null;
            scope.image_src = "data:image/jpeg;base64," + imageData;
            p.uploadImage(scope);
        }, function(err) {
            ToastService.showMessage("danger", err);
        });
    }

});

angular.module('bazaarr').service('ClaimService',
function($rootScope, $state, $timeout, HttpService) {
    this.claim = function(params){
        HttpService.view_url    = "claim-account/create";
        HttpService.is_auth     = false;
        HttpService.params      = {'data': params};

        return HttpService.post();
    }

    this.load_users = function(search){
        HttpService.view_url    = "claim-account";
        HttpService.is_auth     = false;
        HttpService.params      = {'name': search};

        return HttpService.get();
    };
});
