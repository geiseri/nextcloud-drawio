/**
 * Copyright (c) 2017 Pawel Rojek <pawel@pawelrojek.com>
 *
 * This file is licensed under the Affero General Public License version 3 or later.
 *
 **/
(function (OCA) {

    OCA.DrawIO = _.extend({}, OCA.DrawIO);
    if (!OCA.DrawIO.AppName) {
        OCA.DrawIO = {
            AppName: "drawio"
        };
    }

    OCA.DrawIO.DisplayError = function (error) {
        $("#app")
        .text(error)
        .addClass("error");
    };

    OCA.DrawIO.Cleanup = function (receiver, filePath) {
        window.removeEventListener("message", receiver);

        var ncClient = OC.Files.getClient();
        ncClient.getFileInfo(filePath)
        .then(function (status, fileInfo) {
            var url = OC.generateUrl("/apps/files/?dir={currentDirectory}&fileid={fileId}", {
                currentDirectory: fileInfo.path,
                fileId: fileInfo.id
            });
            window.location.href = url;
        })
        .fail(function () {
            var url = OC.generateUrl("/apps/files");
            window.location.href = url;
        });
    };

    OCA.DrawIO.EditFile = function (editWindow, filePath, origin) {
        var ncClient = OC.Files.getClient();
        var receiver = function (evt) {
            if (evt.data.length > 0 && evt.origin === origin) {
                var payload = JSON.parse(evt.data);
                if (payload.event === "init") {
                    var loadMsg = OC.Notification.show(t(OCA.DrawIO.AppName, "Loading, please wait."));
                    ncClient.getFileContents(filePath)
                    .then(function (status, contents) {
                        if (contents === " ") {
                            editWindow.postMessage(JSON.stringify({
                                action: "template",
                                name: filePath
                            }), "*");
                        } else if (contents.indexOf("mxGraphModel") !== -1) {
                            // TODO: show error to user
                            OCA.DrawIO.Cleanup(receiver, filePath);
                        } else {
                            editWindow.postMessage(JSON.stringify({
                                action: "load",
                                xml: contents
                            }), "*");
                        }
                    })
                    .fail(function (status) {
                        console.log("Status Error: " + status);
                        // TODO: show error on failed read
                        OCA.DrawIO.Cleanup(receiver, filePath);
                    })
                    .done(function () {
                        OC.Notification.hide(loadMsg);
                    });
                } else if (payload.event === "load") {
                    // TODO: notify user of loaded
                } else if (payload.event === "export") {
                    // TODO: handle export event
                } else if (payload.event === "save") {
                    var saveMsg = OC.Notification.show(t(OCA.DrawIO.AppName, "Saving..."));
                    ncClient.putFileContents(
                        filePath,
                        payload.xml, {
                            contentType: "x-application/drawio",
                            overwrite: false
                        }
                    )
                    .then(function (status) {
                        OC.Notification.showTemporary(t(OCA.DrawIO.AppName, "File saved!"));
                    })
                    .fail(function (status) {
                        // TODO: handle on failed write
                        OC.Notification.showTemporary(t(OCA.DrawIO.AppName, "File not saved!"));
                    })
                    .done(function () {
                        OC.Notification.hide(saveMsg);
                    });
                } else if (payload.event === "exit") {
                    OCA.DrawIO.Cleanup(receiver, filePath);
                } else {
                    console.log("DrawIO Integration: unknown event " + payload.event);
                    console.dir(payload);
                }
            } else {
                console.log("DrawIO Integration: bad origin " + evt.origin);
            }
        }
        window.addEventListener("message", receiver);
    }
})(OCA);
