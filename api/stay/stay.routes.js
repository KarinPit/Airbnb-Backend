import express from 'express'
import { addStay, addStayMsg, getStayById, getStays, removeStay, removeStayMsg, updateStay } from './stay.controller.js'
import { log } from '../../middlewares/logger.middleware.js'
import { requireAuth } from '../../middlewares/requireAuth.middleware.js'

const router = express.Router()


router.get('/', log, getStays)
router.get('/:stayId', getStayById)
router.delete('/:stayId', log, requireAuth, removeStay)
router.post('/', requireAuth, addStay)
router.put('/:stayId', requireAuth, updateStay)

router.post('/:stayId/msg', requireAuth, addStayMsg)
router.delete('/:stayId/msg/:msgId', requireAuth, removeStayMsg)

export const stayRoutes = router