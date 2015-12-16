angular.module('bazaarr').directive('hashtagFollowButton', function($state, HashtagsService, ToastService, UserService){
    var statuses = {0 : "Follow", 1 : "Unfollow"};
    
    return {
        scope: {
            name: "@"
        },
        restrict: 'E',
        templateUrl: 'app/core/hashtags/follow/hashtags-follow.view.html',
        controller: function($scope) {
            var unbindWatcher = $scope.$watch("name", function(newVal) {
                if (newVal) {
                    HashtagsService.loadByName($scope.name).then(function(data) {
                        $scope.id        = data.data[0].tid;
                        $scope.follow    = HashtagsService.hashtags[$scope.id].is_follow;
                        $scope.text      = statuses[$scope.follow];
                    });
                    unbindWatcher();
                }
            }, true);
        },
        link: function(scope, element) {
            element.on("tap", function() {
                if (!UserService.is_login) {
                    /*
                    UserService.post_login.redirect     = "hashtag";
                    UserService.post_login.params       = {hashtagName : $scope.text};
                    UserService.post_login.broadcast    = "hashtag:follow";
                    */

                    ToastService.showMessage("danger", "Please sign in to follow hashtags");
                    $state.go('login');
                    return false;
                }
                HashtagsService.follow(scope.id, scope.follow).then(function() {
                    scope.follow    = HashtagsService.hashtags[scope.id].is_follow;
                    scope.text      = statuses[scope.follow];
                });
            });
        }
    };
});