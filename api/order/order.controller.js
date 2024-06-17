import { orderService } from './order.service.js'
import { logger } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'


export async function getOrderById(req, res) {
    const { orderId } = req.params
    const lastOrderId = req.cookies.lastOrderId
    try {
        if (lastOrderId === orderId) return res.status(400).send('Dont over do it')
        const order = await orderService.getById(orderId)
        res.cookie('lastOrderId', orderId, { maxAge: 5 * 1000 })
        res.send(order)
    } catch (err) {
        logger.error('Failed to get order', err)
        res.status(400).send({ err: 'Failed to get order' })
    }
}

export async function getOrders(req, res) {
    try {
        logger.debug('Getting Orders:', req.query)
        console.log(req.query);
        const filterBy = {
            buyerId: req.query.buyerId || '',
            hostId: req.query.hostId || '',
            pageIdx: req.query.pageIdx || undefined
        }
        const orders = await orderService.query(filterBy)
        socketService.broadcast({ type: 'order-loaded', data: orders, userId:''})

        res.json(orders)
    } catch (err) {
        logger.error('Failed to get orders', err)
        res.status(400).send({ err: 'Failed to get orders' })
    }
}


export async function addOrder(req, res) {
    const { loggedinUser } = req

    try {
        const order = req.body
        const addedOrder = await orderService.add(order, loggedinUser)
		socketService.broadcast({ type: 'order-added', data: addedOrder, userId: loggedinUser._id })
        res.json(addedOrder)
    } catch (err) {
        logger.error('Failed to add order', err)
        res.status(400).send({ err: 'Failed to add order' })
    }
}


export async function updateOrder(req, res) {
    const { loggedinUser } = req
    try {
        const order = req.body
        const updatedOrder = await orderService.update(order)
		socketService.broadcast({ type: 'order-updated', data: updatedOrder, userId: loggedinUser._id })
        res.json(updatedOrder)
    } catch (err) {
        logger.error('Failed to update order', err)
        res.status(400).send({ err: 'Failed to update order' })
    }
}

export async function removeOrder(req, res) {
    const { loggedinUser } = req
    const { orderId } = req.params
    try {
        const deletedCount = await orderService.remove(orderId)
		socketService.broadcast({ type: 'order-removed', data: orderId, userId: loggedinUser._id })
        res.json(deletedCount)
    } catch (err) {
        logger.error('Failed to remove order', err)
        res.status(400).send({ err: 'Failed to remove order' })
    }
}

export async function addOrderMsg(req, res) {
    const { loggedinUser } = req
    const { orderId } = req.params
    try {
        const msg = {
            txt: req.body.txt,
            by: loggedinUser
        }
        const savedMsg = await orderService.addOrderMsg(orderId, msg)
        res.json(savedMsg)
    } catch (err) {
        logger.error('Failed to update order', err)
        res.status(400).send({ err: 'Failed to update order' })

    }
}

export async function removeOrderMsg(req, res) {
    const { loggedinUser } = req
    const { msgId, orderId } = req.params

    try {
        const removedId = await orderService.removeOrderMsg(orderId, msgId)
        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove order msg', err)
        res.status(400).send({ err: 'Failed to remove order msg' })
    }
}