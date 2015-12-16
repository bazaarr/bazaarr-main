angular.module('bazaarr').controller('LandingCtrl', function($scope, $state, $ionicPopover, UserService, landing) {
    if (UserService.is_login) {
        $state.go("explore");
        return false;
    }

    $scope.landing              = landing.data;
    $scope.first_slide_image_bg = landing.data[1].images[0];
    $scope.setForm              = setForm;
    $scope.hashtags             = landing.data[2].hashtags;
    $scope.collections          = landing.data[3].collections;

    activate();

    function activate() {
        setForm("registration");
    }

    function setForm(form) {
        $scope.form = form;
    }
});
