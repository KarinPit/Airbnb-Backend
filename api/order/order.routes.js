import express from 'express'
import { addOrder, addOrderMsg, getOrderById, getOrders, removeOrder, removeOrderMsg, updateOrder } from './order.controller.js'
import { log } from '../../middlewares/logger.middleware.js'
import { requireAuth } from '../../middlewares/requireAuth.middleware.js'

const router = express.Router()


router.get('/', log, getOrders)
router.get('/:orderId', getOrderById)
router.delete('/:orderId', log, requireAuth, removeOrder)
router.post('/', requireAuth, addOrder)
router.put('/:orderId', requireAuth, updateOrder)

router.post('/:orderId/msg', requireAuth, addOrderMsg)
router.delete('/:orderId/msg/:msgId', requireAuth, removeOrderMsg)

export const orderRoutes = router