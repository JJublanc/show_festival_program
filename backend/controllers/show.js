const Show = require('../models/show');

exports.createOneShow = (req, res, next) => {
    const show = new Show({
        festival: req.body.festival,
        title: req.body.title,
        description: req.body.description,
        duration: req.body.duration,
        imageURL: req.body.imageURL,
        sessions: req.body.sessions
    });
    show.save().then(
        () => {
            res.status(201).json({
                message: 'Post saved successfully!'
            });
        }
    ).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
};

exports.getOneShow = (req, res, next) => {
    Show.findOne({
        _id: req.params.id
    }).then(
        (thing) => {
            res.status(200).json(thing);
        }
    ).catch(
        (error) => {
            res.status(404).json({
                error: error
            });
        }
    );
};

exports.modifyShow = (req, res, next) => {
    const show = new Show({
        _id: req.params.id,
        festival: req.body.festival,
        title: req.body.title,
        description: req.body.description,
        duration: req.body.duration,
        imageURL: req.body.imageURL,
        seances: req.body.seances
    });
    Show.updateOne({_id: req.params.id}, show).then(
        () => {
            res.status(201).json({
                message: 'Thing updated successfully!'
            });
        }
    ).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
};

exports.deleteShow = (req, res, next) => {
    Show.deleteOne({_id: req.params.id}).then(
        () => {
            res.status(200).json({
                message: 'Deleted!'
            });
        }
    ).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
};

exports.getAllShows = (req, res, next) => {
    const filters = req.query;
    console.log(filters)
    Show.find(filters).then(
        (shows) => {
            res.status(200).json(shows);
        }
    ).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
};