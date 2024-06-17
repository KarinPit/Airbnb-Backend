import { logger } from '../../services/logger.service.js'
import { utilService } from '../../services/util.service.js';
import { dbService } from '../../services/db.service.js';
import { ObjectId } from 'mongodb'
import { asyncLocalStorage } from '../../services/als.service.js';
import { log } from '../../middlewares/logger.middleware.js';

export const stayService = {
    query,
    queryAndUpdate,
    getById,
    remove,
    add,
    update,
    addStayMsg,
    removeStayMsg
}

const collectionName = 'Stay'
const PAGE_SIZE = 50


//async function query(filterBy = {}) {
//    try {
//        const criteria = buildCriteria(filterBy);
//        const collection = await dbService.getCollection(collectionName);
//        const stayCursor = await collection.find(criteria);

//        if (filterBy.pageIdx !== undefined) {
//            const startIdx = filterBy.pageIdx * PAGE_SIZE;
//            stayCursor.skip(startIdx).limit(PAGE_SIZE);
//        }

//        stayCursor.sort({price: -1})

//        const stays = await stayCursor.toArray();
//        return stays;
//    } catch (err) {
//        logger.error('Error querying stays:', err);
//        throw err;
//    }
//}

async function query(filterBy = {}) {
    try {
        const criteria = buildCriteria(filterBy);
        const collection = await dbService.getCollection(collectionName);
        const stayCursor = await collection.find(criteria)

        if (filterBy.pageIdx !== undefined) {
            const startIdx = filterBy.pageIdx * PAGE_SIZE
            stayCursor.skip(startIdx).limit(PAGE_SIZE)
        }

        stayCursor.sort({avgRating: -1})
        const stays = stayCursor.toArray()
        return stays

    } catch (err) {
        logger.error('Error querying stays:', err);
        throw err;
    }
}


    async function queryAndUpdate(filterBy = {}) {
        try {
            const criteria = buildCriteria(filterBy);
            const collection = await dbService.getCollection(collectionName);
    
            const pipeline = [
                { $match: criteria },
                { $unwind: '$reviews' },
                {
                    $addFields: {
                        'reviews.moreRate.avg': {
                            $avg: [
                                '$reviews.moreRate.cleanliness',
                                '$reviews.moreRate.accuracy',
                                '$reviews.moreRate.communication',
                                '$reviews.moreRate.location',
                                '$reviews.moreRate.checkIn',
                                '$reviews.moreRate.value'
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: '$_id',
                        doc: { $first: '$$ROOT' },
                        avgRating: { $avg: '$reviews.moreRate.avg' }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: ['$doc', { avgRating: '$avgRating' }]
                        }
                    }
                },
                { $sort: { avgRating: -1, price: -1 } },
                { $skip: filterBy.pageIdx ? filterBy.pageIdx * PAGE_SIZE : 0 },
                { $limit: PAGE_SIZE }
            ];
    
            const stays = await collection.aggregate(pipeline).toArray();
    
            // Step 2: Update the DB with avgRating
            for (const stay of stays) {
                await collection.updateOne(
                    { _id: stay._id },
                    { $set: { avgRating: stay.avgRating } }
                );
            }
    
            return stays;
        } catch (err) {
            logger.error('Error querying stays:', err);
            throw err;
        }
    }

async function getById(stayId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        const stay = await collection.findOne({ _id: stayId });
        if (!stay) throw `Couldn't find stay with _id ${stayId}`
        return stay
    } catch (err) {
        logger.error(`while finding stay ${stayId}`, err)
        throw err
    }
}


async function remove(stayId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        const { deletedCount } = await collection.deleteOne({ _id: new ObjectId(stayId) })
        return deletedCount
    } catch (err) {
        logger.error(`cannot remove stay ${stayId}`, err)
        throw err
    }
}


async function add(stayToSave, loggedinUser) {
    try {
        stayToSave.owner = loggedinUser
        const collection = await dbService.getCollection(collectionName)
        await collection.insertOne(stayToSave)
        return stayToSave
    } catch (err) {
        logger.error('stayService, can not add stay : ' + err)
        throw err
    }
}


async function update(stay) {
    try {
        // Peek only updateable fields
        const stayToSave = {
            vendor: stay.vendor,
            speed: stay.speed
        }
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(stay._id) }, { $set: stayToSave })
        return stay
    } catch (err) {
        logger.error(`cannot update stay ${stay._id}`, err)
        throw err
    }
}


async function addStayMsg(stayId, msg) {
    try {
        msg.id = utilService.makeId()
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(stayId) }, { $push: { msgs: msg } })
        return msg
    } catch (err) {
        logger.error(`cannot add stay msg ${stayId}`, err)
        throw err
    }
}


async function removeStayMsg(stayId, msgId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        await collection.updateOne({ _id: new ObjectId(stayId) }, { $pull: { msgs: { id: msgId } } })
        return msgId
    } catch (err) {
        logger.error(`cannot add stay msg ${stayId}`, err)
        throw err
    }
}


function buildCriteria(filterBy) {
    const criteria = {};

    // Match category tags using regex
    if (filterBy.category_tag) {
        const regex = new RegExp(filterBy.category_tag, "i");
        criteria.labels = { $regex: regex };
    }

    // Match amenities through direct inclusion
    if (filterBy.amenities) {
        criteria.amenities = { $all: filterBy.amenities };
    }

    // Match property types using regex
    if (filterBy.l2_property_type_ids) {
        const pattern = filterBy.l2_property_type_ids.join("|");
        const regex = new RegExp(pattern, "i");
        criteria.type = { $regex: regex };
    }

    // Determine if stay is within the specified price range
    if (filterBy.price_min || filterBy.price_max) {
        criteria.price = {};
        if (filterBy.price_min) {
            criteria.price.$gte = filterBy.price_min;
        }
        if (filterBy.price_max) {
            criteria.price.$lte = filterBy.price_max;
        }
    }

    // Determine if stay is within the specified guest favorite
    if (filterBy.guest_favorite !== undefined) {
        criteria.guest_favorite = filterBy.guest_favorite;
    }

    // Date range filter
    if (filterBy.startDate && filterBy.endDate) {
        const startDate = new Date(filterBy.startDate);
        const endDate = new Date(filterBy.endDate);

        criteria['availabilityPeriods'] = {
            $elemMatch: {
                startDate: { $lte: endDate },
                endDate: { $gte: startDate }
            }
        };
    }

    // Guest count filter
    if (filterBy.guestCount) {
        criteria.capacity = { $gte: filterBy.guestCount };
    }

    return criteria;
}


//async function query(filterBy = {}) {
//    try {
//        const criteria = _buildCriteria(filterBy)
//        const collection = await dbService.getCollection(collectionName)
//        const stayCursor = await collection.find(criteria)

//        if (filterBy.pageIdx !== undefined) {
//            const startIdx = filterBy.pageIdx * PAGE_SIZE
//            stayCursor.skip(startIdx).limit(PAGE_SIZE)
//        }

//        const stays = stayCursor.toArray()

//        // var stays = await collection.find(criteria).toArray()

//        // if (filterBy.pageIdx !== undefined) {
//        //     const startIdx = filterBy.pageIdx * PAGE_SIZE
//        //     stays = stays.slice(startIdx, startIdx + PAGE_SIZE)
//        // }

//        return stays
//    } catch (err) {
//        logger.error(err)
//        throw err
//    }
//}

//async function getById(stayId) {
//    try {
//        const collection = await dbService.getCollection(collectionName)
//        const stay = collection.findOne({ _id: new ObjectId(stayId) })
//        if (!stay) throw `Couldn't find stay with _id ${stayId}`
//        return stay
//    } catch (err) {
//        logger.error(`while finding stay ${stayId}`, err)
//        throw err
//    }
//}

//async function remove(stayId) {
//    try {
//        const collection = await dbService.getCollection(collectionName)
//        const { deletedCount } = await collection.deleteOne({ _id: new ObjectId(stayId) })
//        return deletedCount
//    } catch (err) {
//        logger.error(`cannot remove stay ${stayId}`, err)
//        throw err
//    }
//}

//async function add(stayToSave, loggedinUser) {
//    try {
//        stayToSave.owner = loggedinUser
//        const collection = await dbService.getCollection(collectionName)
//        await collection.insertOne(stayToSave)
//        return stayToSave
//    } catch (err) {
//        logger.error('stayService, can not add stay : ' + err)
//        throw err
//    }
//}

//async function update(stay) {
//    try {
//        // Peek only updateable fields
//        const stayToSave = {
//            vendor: stay.vendor,
//            speed: stay.speed
//        }
//        const collection = await dbService.getCollection(collectionName)
//        await collection.updateOne({ _id: new ObjectId(stay._id) }, { $set: stayToSave })
//        return stay
//    } catch (err) {
//        logger.error(`cannot update stay ${stay._id}`, err)
//        throw err
//    }
//}


//async function addStayMsg(stayId, msg) {
//    try {
//        msg.id = utilService.makeId()
//        const collection = await dbService.getCollection(collectionName)
//        await collection.updateOne({ _id: new ObjectId(stayId) }, { $push: { msgs: msg } })
//        return msg
//    } catch (err) {
//        logger.error(`cannot add stay msg ${stayId}`, err)
//        throw err
//    }
//}

//async function removeStayMsg(stayId, msgId) {
//    try {
//        const collection = await dbService.getCollection(collectionName)
//        await collection.updateOne({ _id: new ObjectId(stayId) }, { $pull: { msgs: { id: msgId } } })
//        return msgId
//    } catch (err) {
//        logger.error(`cannot add stay msg ${stayId}`, err)
//        throw err
//    }
//}

//function _buildCriteria(filterBy) {
//    const criteria = {}

//    if (filterBy.txt) {
//        criteria.vendor = { $regex: filterBy.txt, $options: 'i' }
//    }

//    if (filterBy.minSpeed) {
//        criteria.speed = { $gt: filterBy.minSpeed }
//    }

//    return criteria
//}