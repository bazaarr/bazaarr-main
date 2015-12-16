angular.module('bazaarr').controller('BrandsCtrl', function($scope, brands) {
    $scope.brands = brands.data;
});
