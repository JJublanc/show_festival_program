const Festival = require('../models/festival');

exports.createOneFestival = (req, res, next) => {
         // Cherche d'abord si un festival avec le même nom existe déjà
    Festival.findOne({ name: req.body.name })
        .then((existingFestival) => {
            if (existingFestival) {
                // Si un festival avec le même nom existe, renvoie une erreur
                 throw new Error('This show already exists');
            }
            // Si non, crée un nouveau festival
            const festival = new Festival({
                name: req.body.name,
                start: req.body.start,
                end: req.body.end,
            });
            // Enregistre le nouveau festival dans la base de données
            return festival.save();
        })
        .then(() => {
            res.status(201).json({
                message: 'Festival saved successfully!'
            });
        })
        .catch((error) => {
            res.status(400).json({
                error: error
            });
        });
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

exports.test = (req, res, next) => {
    res.status(200).json({
        message: 'Test'
    });
}