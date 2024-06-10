import { logger } from '../../services/logger.service.js'
import { utilService } from '../../services/util.service.js';
import { dbService } from '../../services/db.service.js';
import { ObjectId } from 'mongodb'
import { asyncLocalStorage } from '../../services/als.service.js';

export const stayService = {
    query,
    getById,
    remove,
    add,
    update,
    addStayMsg,
    removeStayMsg
}

const collectionName = 'stay'
const PAGE_SIZE = 4

async function query(filterBy = {}) {
    try {
        const criteria = _buildCriteria(filterBy)
        const collection = await dbService.getCollection(collectionName)
        const stayCursor = await collection.find(criteria)

        if (filterBy.pageIdx !== undefined) {
            const startIdx = filterBy.pageIdx * PAGE_SIZE
            stayCursor.skip(startIdx).limit(PAGE_SIZE)
        }

        const stays = stayCursor.toArray()

        // var stays = await collection.find(criteria).toArray()

        // if (filterBy.pageIdx !== undefined) {
        //     const startIdx = filterBy.pageIdx * PAGE_SIZE
        //     stays = stays.slice(startIdx, startIdx + PAGE_SIZE)
        // }

        return stays
    } catch (err) {
        logger.error(err)
        throw err
    }
}

async function getById(stayId) {
    try {
        const collection = await dbService.getCollection(collectionName)
        const stay = collection.findOne({ _id: new ObjectId(stayId) })
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

function _buildCriteria(filterBy) {
    const criteria = {}

    if (filterBy.txt) {
        criteria.vendor = { $regex: filterBy.txt, $options: 'i' }
    }


    if (filterBy.minSpeed) {
        criteria.speed = { $gt: filterBy.minSpeed }
    }

    return criteria
}