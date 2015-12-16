'use strict';

angular.module('bazaarr').controller('LoginCtrl',
function($scope, $rootScope, $state, $cookies, $cordovaPush,
UserService, RegistrationService, DeviceAdapterService, CollectionService, ToastService, HttpService, MetaService, FacebookService) {
    if (UserService.is_login) {
        $state.go('account.collections', {"userId" : UserService.user.uid});
        return false;
    }

    MetaService.set("login");

    $scope.getToken = function() {
        UserService.getToken().then(function(data) {
            UserService.token = data.data;
            $cookies["CSRF-TOKEN"]              = data.data;

            //$scope.isConnect();
            $state.go('user.collections');
        });
    }

    $scope.isConnect = function() {
        UserService.isConnect().then(function(data) {
            p(data.data.user);
        });
    }

    $scope.checkKey = function($event) {
        if($event.keyCode == 13) {
            $scope.signIn($scope.user);
        }
    };

    $scope.signIn = function(user, type) {
        if (UserService.is_login) {
            $state.go('account.collections', {"userId" : UserService.user.uid});
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
            user.device_id = "";
            $scope.login(user, type);
        //}
    }

    $scope.login = function(user, type) {
        UserService.signIn(user, type).then(function(data) {
            CollectionService.user_collections  = data.data.collections;
            HttpService.clearCache();
            UserService.loginCallback(data.data);
        },
        function(reason) {
            UserService.clearUser();
            /*if(typeof reason.data.messages != 'undefined'){
                var msgs = reason.data.messages,
                    _rs = [];
                for(var f in msgs){
                    var _msgs = msgs[f];
                    if(_msgs.length){
                        for(var i=0;i<_msgs.length;i++){
                            _rs.push(_msgs[i]);
                        }
                    }
                }
                if(_rs.length){
                    ToastService.showMessage('danger', _rs.join('</br>').replace('/user/password', '#!/forgot-password'));
                }
            } else {
                ToastService.showMessage("danger", reason.data);
            }*/
        });
    }

    $scope.create = function(user) {
        RegistrationService.add(user).then(function(data){
            var login = {};
            login.username = user.name;
            login.password = user.pass;
            $scope.signIn(login);

        }, function(reason){
            ToastService.showDrupalFormMessage("danger", reason.data);
        });
    };

    $scope.fbLogin = function() {
        FacebookService.login().then(function(data) {
            $scope.signIn(data.data, "social");
        });
    };

    $scope.user = {};
});

angular.module('bazaarr').controller('ForgotPasswordCtrl', function($scope, ForgotPasswordService, ToastService) {
    $scope.forgot = {};
    $scope.forgot.name = "";
    $scope.sendPassword = function(name) {
        ForgotPasswordService.sendPassword(name).then(function(data) {
            $scope.forgot.name = "";
            ToastService.showMessage("success", "Further instructions have been sent to your e-mail address");
        }, function(reason) {
            ToastService.showMessage("danger", reason.data);
        });
    };
});

angular.module('bazaarr').controller('ResetPasswordCtrl',
function($state, ForgotPasswordService) {
    var hash_data = {};
    hash_data.uid           = $state.params.userId
    hash_data.timestamp     = $state.params.timestamp;
    hash_data.hashed_pass   = $state.params.hash;
    ForgotPasswordService.hashLogin(hash_data);
});

angular.module('bazaarr').controller('LoginLinkCtrl',
function(LoginService) {
    LoginService.remoteLogin();
});

angular.module('bazaarr').controller('OauthcallbackCtrl',
function($state, UserService, ToastService, CollectionService, HttpService) {
    openFB.api({
        path: '/me',
        success: function(user) {
            /* TODO: connect with LoginCtrl */
            user.is_fb = true;

            if (UserService.is_login) {
                $state.go('account.collections', {"userId" : UserService.user.uid});
                return false;
            }

            user.device_id = "";

            UserService.signIn(user, "social").then(function(data) {
                CollectionService.user_collections  = data.data.collections;
                HttpService.clearCache();
                UserService.loginCallback(data.data);
            },
            function(reason) {
                UserService.clearUser();
                ToastService.showMessage("danger", reason.data);
            });
        }
    });
});

angular.module('bazaarr').controller('LogoutcallbackCtrl',
function() {
    alert('closing');
    window.close();
});

angular.module('bazaarr').service('LoginService',
function($state, $rootScope, HttpService, UserService, ToastService, CollectionService) {
    this.remoteLogin = function() {
        if (angular.isDefined(UserService.user.uid) && UserService.user.uid) {
            this.remoteLoginCallback();
            return true;
        }
        HttpService.view_url    = "remote-login";
        HttpService.is_auth     = false;
        HttpService.params      = {"hash" : $state.params.hashLogin};
        var promise = HttpService.post();

        var that = this;
        promise.then(function(data) {
            CollectionService.user_collections  = data.data.collections;
            UserService.store(data.data);
            that.remoteLoginCallback();
        }, function(reason) {
            ToastService.showMessage("danger", reason.data);
            $state.go("login");
        });
    };

    this.remoteLoginCallback = function() {
        var event = $state.params.event.split("_");
        switch (event[0]) {
            case "collections":
                $state.go("account.collections", {'userId' : UserService.user.uid})
                .then(function(){
                    p(event[1]);
                });
                break;
            case "like":
                $state.go("clip", {'clipId' : event[1]})
                .then(function(){
                    $rootScope.$broadcast('clip:like');
                });
                break;
        }
    }
    //http://bazaarr.dev/l/OtOJ0UobXBk_?destination=collections/127/accept
});

angular.module('bazaarr').service('ForgotPasswordService',
function($state, $q, HttpService, UserService, CollectionService, ToastService) {
    this.sendPassword = function(name) {
        if (!name) {
            return $q.reject({"data" : "Please enter your username or e-mail address"});
        }

        HttpService.view_url    = "user/request_new_password";
        HttpService.is_auth     = false;
        HttpService.params      = {"name" : name};
        return HttpService.post();
    };

    this.hashLogin = function(hash_data) {
        if (UserService.is_login) {
            ToastService.showMessage("danger", "You are already logged in");
            $state.go("account.collections", {"userId" : UserService.user.id});
            return false;
        }
        HttpService.view_url    = "hash-login";
        HttpService.is_auth     = false;
        HttpService.params      = hash_data;
        HttpService.post().then(function(data) {
            ToastService.showMessage("success",
                "You have just used your one-time login link. It is no longer necessary to use this link to log in. \n\
                Please change your password.");
            CollectionService.user_collections  = data.data.collections;
            data.data.user.forgot_password = 1;
            UserService.loginCallback(data.data);
        }, function(reason) {
            ToastService.showMessage("danger", reason.data);
            $state.go("forgot-password");
        });
    };
});
