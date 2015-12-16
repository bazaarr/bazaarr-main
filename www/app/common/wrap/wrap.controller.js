angular.module('bazaarr').controller('WrapCtrl', function($scope, $state) {
    $scope.navbar = $state.params.navbar.name || "default";
});