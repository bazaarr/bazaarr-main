angular.module('bazaarr').controller('ExploreCtrl', function($scope, $state, $compile, ExploreService, ClipsService, explore, titles) {
    $scope.titles   = titles;
    $scope.explores = explore;
    $scope.order    = ExploreService.order;
    $scope.count    = ExploreService.count;
    
    activate();

    function activate() {
        setWidth();
    }
    
    function setWidth() {
        $scope.width = Math.floor(100 / ClipsService.getColsNumber());
    }
    
    $scope.$on('orientation:change', function() {
        if ($scope.$$phase) {
            setWidth()
        }
        else {
            $scope.$apply(function () {
                setWidth()
            });
        }
    });
});
