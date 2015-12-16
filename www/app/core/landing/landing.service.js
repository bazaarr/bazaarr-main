angular.module('bazaarr').service('LandingService', function(HashtagsService, UserService, HttpService) {
    this.load = function() {
        if (UserService.is_login) {
            return {};
        }
        HttpService.view_url    = "get_landing_blocks/front";
        HttpService.is_auth     = false;
        var promise = HttpService.get();

        // var promise = {
        //     1 : {
        //         title   : "Bazaarr",
        //         images  : [
        //             'https://www.bazaarr.org/sites/all/themes/nbazaarr/images/bg2.jpg',
        //             'https://www.bazaarr.org/sites/all/themes/nbazaarr/images/bg7.jpg',
        //             'https://www.bazaarr.org/sites/all/themes/nbazaarr/images/bg8.jpg',
        //             'https://www.bazaarr.org/sites/all/themes/nbazaarr/images/bg10.jpg'
        //         ]
        //     },
        //     2 : {
        //         title       : "Second page",
        //         description : "Some description",
        //         hashtags    : [
        //             {
        //                 tid         : 463,
        //                 name        : "#pakistan",
        //                 clip_image  : {
        //                     img_large : "https://www.bazaarr.org/sites/default/files/clip_images/d2/94/d2940dbfea358b077d04ed3e936365fd.jpg"
        //                 }
        //             },
        //             {
        //                 tid         : 171,
        //                 name        : "#indianfashion",
        //                 clip_image  : {
        //                     img_large : "https://www.bazaarr.org/sites/default/files/clip_images/83/01/830102383e0f9b1653812c800290d190.jpg"
        //                 }
        //             },
        //             {
        //                 tid         : 1051,
        //                 name        : "#afghan",
        //                 clip_image  : {
        //                     img_large : "https://www.bazaarr.org/sites/default/files/clip_images/26/51/2651598145afbd4d18d1432e0ce66168.jpg"
        //                 }
        //             },
        //             {
        //                 tid         : 357,
        //                 name        : "#fashiondistrict",
        //                 clip_image  : {
        //                     img_large : "https://www.bazaarr.org/sites/default/files/clip_images/c9/65/c965109e283d9fe57aa0b4f3bb1fdeff.jpg"
        //                 }
        //             }
        //         ]
        //     },
        //     3 : {
        //         title       : "third page",
        //         description : "lkjh guf jhgkljhkljgytf",
        //         collections : [
        //             {
        //                 tid         : 2587,
        //                 name        : "Fashion",
        //                 cover_img   : "https://www.bazaarr.org/sites/default/files/clip_images/28/bf/28bfbbc8c2d3f6cc332122788c1d9030.JPG"
        //             },
        //             {
        //                 tid         : 118,
        //                 name        : "Style PK",
        //                 cover_img   : "https://www.bazaarr.org/sites/default/files/clip_images/4c/4b/4c4b26f51459a5ec92a56052258e8cc6.jpg"
        //             },
        //             {
        //                 tid         : 115,
        //                 name        : "Salwar Kameez",
        //                 cover_img   : "https://www.bazaarr.org/sites/default/files/clip_images/d3/32/d332e94be44baf0612e34f5c13558a8b.JPG"
        //             },
        //             {
        //                 tid         : 107,
        //                 name        : "Pak Couture",
        //                 cover_img   : "https://www.bazaarr.org/sites/default/files/clip_images/41/76/41761357a39811d11b9f3ca3facab60e.jpg"
        //             }
        //         ]
        //     }
        // };
        promise.then(function(data){
            HashtagsService.setHashtags(data.data[2].hashtags);
        });

        return promise;
    };
});
