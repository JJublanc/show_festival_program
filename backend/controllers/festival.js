const Festival = require('../models/festival');

exports.createOneFestival = (req, res, next) => {
    const festival = new Festival({
        name: req.body.name,
        start: req.body.start,
        end: req.body.end,
    });
    festival.save().then(
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

exports.getOneFestival = (req, res, next) => {
    Festival.findOne({
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

exports.modifyFestival = (req, res, next) => {
    const festival = new Festival({
        _id: req.params.id,
        name: req.body.name,
        start: req.body.start,
        end: req.body.end,
    });
    Festival.updateOne({_id: req.params.id}, festival).then(
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
}

exports.deleteFestival = (req, res, next) => {
    Festival.deleteOne({_id: req.params.id}).then(
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

exports.getAllFestivals = (req, res, next) => {
    Festival.find().then(
        (festivals) => {
            res.status(200).json(festivals);
        }
    ).catch(
        (error) => {
            res.status(400).json({
                error: error
            });
        }
    );
};