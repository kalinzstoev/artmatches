//Template reactive array variable


Template.visualPostSubmit.onCreated(function() {
    Session.set('visualPostSubmitErrors', {});
    var instance = this;
    instance.filesIdArray = new ReactiveArray();
});

Template.visualPostSubmit.helpers({
    errorMessage: function(field) {
        return Session.get('visualPostSubmitErrors')[field];
    },
    errorClass: function (field) {
        return !!Session.get('visualPostSubmitErrors')[field] ? 'has-error' : '';
    },
    images: function() {

        if (Template.instance().filesIdArray.list().length > 0){
            return Images.find({
                '_id': {$in: Template.instance().filesIdArray.array()}
            })
        }
    },

    isFileUploading: function() {
        return Session.get('isFileUploading');
    },

    disableUploadButton: function(){
        if (Session.get('isFileUploading')==true){
            return "disabled";
        }
    }
});

Template.visualPostSubmit.events({
    'submit form': function(e, instance) {
        e.preventDefault();

        var post = {
            postType: 'visual',
            title: $(e.target).find('[name=title]').val(),
            description: $(e.target).find('[name=description]').val(),
            category: $(e.target).find('[name=category]').val(),
            tags: $("#tags").tagsinput('items'),
            filesIdArray: instance.filesIdArray.slice(),
            isContentPresent: instance.filesIdArray.length > 0
        };

        var errors = validateFilePost(post);
        if (errors.title || errors.category || errors.isContentPresent)
            return Session.set('visualPostSubmitErrors', errors);

        Meteor.call('postFileInsert', post, function(error, result) {
            // display the error to the user and abort
            if (error) {
                return throwError(error.reason);
            }else {
                instance.filesIdArray.clear();
                Router.go('postPage', {_id: result._id});
            }
        });
    },

    "change .add_image": function(e, instance){
        var user = Meteor.user();

        FS.Utility.eachFile(e, function(file)
        {
            var newFile = new FS.File(file);
            newFile.username = user.username;
            newFile.userId = user._id;
            newFile.userSlug = Slug.slugify(user.username);

            Images.insert(newFile, function (error, result) {
                if (error) {
                    toastr.error("File upload failed... please try again.");
                } else {

                    Session.set('isFileUploading', true);

                    var intervalHandle = Meteor.setInterval(function () {

                        if (result.hasStored('images')) {
                            // File has been uploaded and stored. Can safely display it on the page.
                            Session.set('isFileUploading', false);
                            instance.filesIdArray.push(result._id);
                            toastr.success('File upload succeeded!');
                            // File has stored, close out interval
                            Meteor.clearInterval(intervalHandle);
                        }
                    }, 1000);
                }
            });
        });
    },

    'click .delete-image': function(e, instance) {
        e.preventDefault();

        var sure = confirm('Are you sure you want to delete this image?');
        if (sure === true) {
            var imageId = this._id;
            Images.remove({ _id:imageId }, function(error) {
                if (error) {
                    toastr.error("Delete failed... " + error);
                } else {
                    instance.filesIdArray.remove(imageId);
                    toastr.success('Image deleted!');
                }
            })
        }
    }
});

Template.visualPostSubmit.rendered = function(){
    $('#tags').tagsinput();
}




