angular.module('bazaarr').directive('brandItem', function($state, UserService, ToastService) {
    return {
        replace: true,
        restrict: 'E',
        templateUrl: 'app/core/brands/item/brand-item.view.html',
        controller: function($scope, FollowService) {
            $scope.followUser = followUser;

            function followUser(uid, is_followed) {
                if (!UserService.is_login) {
                    ToastService.showMessage("danger", "Please sign in to follow brands");
                    $state.go('login');
                    return false;
                }

                $scope.brand.is_followed = !is_followed;
                FollowService.followUser(uid, $scope.brand.is_followed);
            }
        }
    };
});
