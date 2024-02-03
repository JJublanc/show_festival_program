const Show = require('../models/show');

exports.createOneShow = (req, res, next) => {
    Show.findOne({
        festival: req.body.festival,
        title: req.body.title
    }).then((existingShow) => {
        if (existingShow) {
            // Si un spectacle existe déjà, envoie une réponse et termine la fonction ici.
            throw new Error('This show already exists');
        }
        // Crée un nouveau spectacle si aucun spectacle existant n'est trouvé.
        const show = new Show({
            festival: req.body.festival,
            title: req.body.title,
            description: req.body.description,
            duration: req.body.duration,
            imageURL: req.body.imageURL,
            sessions: req.body.sessions
        });
        return show.save();
    })
    .then(() => {
        // Réponse envoyée seulement si `show.save()` réussit.
        res.status(201).json({
            message: 'Show saved successfully!'
        });
    })
    .catch((error) => {
        // Gestion des erreurs pour `Show.findOne()` et `show.save()`.
        if (error.message === 'This show already exists') {
            return res.status(409).json({
                error: error.message
            });
        }
        res.status(400).json({
            error: error
        });
    });
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

exports.deleteAllShowsForFestival = (req, res, next) => {
    // Supprime tous les spectacles associés à l'ID du festival fourni
    Show.deleteMany({festival: req.params.name})
        .then(() => {
            res.status(200).json({
                message: 'All shows for the festival deleted!'
            });
        })
        .catch((error) => {
            res.status(400).json({
                error: error
            });
        });
};

exports.getAllShows = (req, res, next) => {
    const filters = {...req.query};
    let queryConditions = [];

    // Si un terme de recherche est fourni, l'ajouter aux conditions de la requête
    if (filters.term) {
        queryConditions.push({$text: {$search: filters.term}});
        delete filters.term; // Supprimer le terme de recherche des filtres
    }

    // Ajouter les autres filtres de requête
    for (const key in filters) {
        // Construire la condition pour chaque filtre
        queryConditions.push({[key]: filters[key]});
    }

    // Construire la requête en utilisant $and pour combiner les conditions
    let query = Show.find(queryConditions.length > 0 ? {$and: queryConditions} : {});

    query.then(shows => {
        res.status(200).json(shows);
    }).catch(error => {
        res.status(400).json({error: error});
    });
};