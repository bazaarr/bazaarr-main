angular.module('bazaarr').controller('HashtagListCtrl', function($scope, $rootScope, $state, HashtagsService, hashtags) {
    $scope.hashtags             = hashtags.data;
    $scope.view                 = $state.params.hashtag_item_view || "account";
    $scope.$parent.doRefresh    = refreshContent;
    
    function refreshContent() {
        HashtagsService.loadListByUser(true).then(function(data) {
            $scope.hashtags = data.data;
            $rootScope.$broadcast('scroll.refreshComplete');
        });
    };
});