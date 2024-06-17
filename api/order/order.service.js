import { logger } from '../../services/logger.service.js';
import { utilService } from '../../services/util.service.js';
import { dbService } from '../../services/db.service.js';
import { ObjectId } from 'mongodb';
import { log } from '../../middlewares/logger.middleware.js';

export const orderService = {
    query,
    getById,
    remove,
    add,
    update,
    addOrderMsg,
    removeOrderMsg
};

const collectionName = 'Order';
const PAGE_SIZE = 4;

async function query(filterBy = {}) {
    try {
        const criteria = _buildCriteria(filterBy);
        const collection = await dbService.getCollection(collectionName);
        let orders = await collection.aggregate([
            { $match: criteria },
            { $sort: { orderTime: -1, status: 1 } },
            {
                $lookup: {
                    from: 'Stay',
                    localField: 'stay._id',
                    foreignField: '_id',
                    as: 'stayDetails'
                }
            },
            { $unwind: '$stayDetails' }
        ]).toArray();

        if (filterBy.pageIdx !== undefined) {
            const startIdx = filterBy.pageIdx * PAGE_SIZE;
            orders = orders.slice(startIdx, startIdx + PAGE_SIZE);
        }

        return orders;
    } catch (err) {
        logger.error('Failed to query orders', err);
        throw err;
    }
}

function _buildCriteria(filterBy) {
    const criteria = {};

    if (filterBy.buyerId) {
        criteria['buyer._id'] = filterBy.buyerId;
    }

    if (filterBy.hostId) {
        criteria.hostId =filterBy.hostId;
    }

    return criteria;
}

async function getById(orderId) {
    try {
        const collection = await dbService.getCollection(collectionName);
        const order = await collection.findOne({ _id: new ObjectId(orderId) });
        if (!order) throw `Couldn't find order with _id ${orderId}`;
        return order;
    } catch (err) {
        logger.error(`while finding order ${orderId}`, err);
        throw err;
    }
}

async function remove(orderId) {
    try {
        const collection = await dbService.getCollection(collectionName);
        const { deletedCount } = await collection.deleteOne({ _id: new ObjectId(orderId) });
        return deletedCount;
    } catch (err) {
        logger.error(`cannot remove order ${orderId}`, err);
        throw err;
    }
}

async function add(orderToSave, loggedinUser) {
    try {
        orderToSave.owner = loggedinUser;
        orderToSave.orderTime = new Date();
        const collection = await dbService.getCollection(collectionName);
        await collection.insertOne(orderToSave);
        return orderToSave;
    } catch (err) {
        logger.error('orderService, can not add order : ' + err);
        throw err;
    }
}

async function update(order) {
    try {
        const orderToSave = {
            status: order.status
        };
        const collection = await dbService.getCollection(collectionName);
        await collection.updateOne({ _id: new ObjectId(order._id) }, { $set: orderToSave });
        return order;
    } catch (err) {
        logger.error(`cannot update order ${order._id}`, err);
        throw err;
    }
}

async function addOrderMsg(orderId, msg) {
    try {
        msg.id = utilService.makeId();
        const collection = await dbService.getCollection(collectionName);
        await collection.updateOne({ _id: new ObjectId(orderId) }, { $push: { msgs: msg } });
        return msg;
    } catch (err) {
        logger.error(`cannot add order msg ${orderId}`, err);
        throw err;
    }
}

async function removeOrderMsg(orderId, msgId) {
    try {
        const collection = await dbService.getCollection(collectionName);
        await collection.updateOne({ _id: new ObjectId(orderId) }, { $pull: { msgs: { id: msgId } } });
        return msgId;
    } catch (err) {
        logger.error(`cannot remove order msg ${orderId}`, err);
        throw err;
    }
}
