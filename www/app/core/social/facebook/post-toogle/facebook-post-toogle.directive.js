angular.module('bazaarr').directive('facebookPostToogle', function(){
    return {
        scope: {
            node: "="
        },
        restrict: 'E',
        templateUrl: 'app/core/social/facebook/post-toogle/facebook-post-toogle.view.html',
        controller: function($scope, FacebookService, UserService) {
            $scope.$watch("node.send_to_facebook", function(newVal) {
                if (newVal === "1" && angular.isUndefined(UserService.user.data.hybridauth)) {
                    $scope.node.send_to_facebook = "0";
                    FacebookService.login().then(function(data) {
                        UserService.signIn(data.data, "social").then(function(data) {
                            UserService.store(data.data);
                            if (angular.isDefined(UserService.user.data.hybridauth)) {
                                $scope.node.send_to_facebook = "1";
                            }
                        });
                    });
                }
            });
        }
    };
});
