angular.module('bazaarr').service('FacebookService', function($q, ToastService) {
    this.login = function() {
        var domain = window.location.host.split('.').pop(),
            appId = '';
        switch(domain){
            case 'dev':
                appId = 1679149242321919;
                break;
            case 'org':
                appId = 430153587174464;
                break;
            case 'net':
                appId = 430153653841124;
                break;
            case 'com':
                appId = 426982654158224;
                break;
        }
        if (appId) {
            openFB.init({appId: appId});
        }

        var dfd = $q.defer();

        openFB.login(function(response) {
            if (response.status === 'connected') {
                openFB.api({
                    path: '/me',
                    success: function(data) {
                        data.is_fb = true;
                        data.token = response.authResponse.accessToken;
                        dfd.resolve({data : data});
                    }
                });
            }
            else {
                var message = "Facebook login failed: " + response.error;
                ToastService.showMessage("danger", message);
                dfd.reject({data : message});
            }
        }, {scope: 'public_profile,email,user_about_me,user_birthday,user_friends,user_hometown,user_website,publish_actions'});

        return dfd.promise;
    };
});
