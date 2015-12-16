angular.module('bazaarr').directive('hashtagItem', function(HashtagsService){    
    return {
        scope: {
            name: "@",
            view: "@"
        },
        restrict: 'E',
        templateUrl: 'app/core/hashtags/item/hashtags-item.view.html',
        controller: function($scope) {
            var unbindWatcher = $scope.$watch("name", function(newVal) {
                if (newVal) {
                    HashtagsService.loadByName(newVal).then(function(data) {
                        $scope.hashtag = HashtagsService.hashtags[data.data[0].tid];
                    });
                    unbindWatcher();
                }
            });
        }
    };
});