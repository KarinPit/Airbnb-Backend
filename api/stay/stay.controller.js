import { stayService } from './stay.service.js'
import { logger } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'

export async function getStays(req, res) {
    try {
        logger.debug('Getting Stays:', req.query);
        const filterBy = {};
        logger.debug('FilterBy:', filterBy);
        const stays = await stayService.query(filterBy);
        res.json(stays);
        
    } catch (err) {
        logger.error('Failed to get stays', err);
        res.status(400).send({ err: 'Failed to get stays' });
    }
}

export async function getStayById(req, res) {
    const { stayId } = req.params
    const lastStayId = req.cookies.lastStayId
    try {
        if (lastStayId === stayId) return res.status(400).send('Dont over do it')
        const stay = await stayService.getById(stayId)
        res.cookie('lastStayId', stayId, { maxAge: 5 * 1000 })
        res.send(stay)
    } catch (err) {
        logger.error('Failed to get stay', err)
        res.status(400).send({ err: 'Failed to get stay' })
    }
}

export async function addStay(req, res) {
    const { loggedinUser } = req

    try {
        const stay = req.body
        const addedStay = await stayService.add(stay, loggedinUser)
		socketService.broadcast({ type: 'stay-added', data: addedStay, userId: loggedinUser._id })
        res.json(addedStay)
    } catch (err) {
        logger.error('Failed to add stay', err)
        res.status(400).send({ err: 'Failed to add stay' })
    }
}


export async function updateStay(req, res) {
    const { loggedinUser } = req
    try {
        const stay = req.body
        const updatedStay = await stayService.update(stay)
		socketService.broadcast({ type: 'stay-updated', data: updatedStay, userId: loggedinUser._id })
        res.json(updatedStay)
    } catch (err) {
        logger.error('Failed to update stay', err)
        res.status(400).send({ err: 'Failed to update stay' })
    }
}

export async function removeStay(req, res) {
    const { loggedinUser } = req
    const { stayId } = req.params
    try {
        const deletedCount = await stayService.remove(stayId)
		socketService.broadcast({ type: 'stay-removed', data: stayId, userId: loggedinUser._id })
        res.json(deletedCount)
    } catch (err) {
        logger.error('Failed to remove stay', err)
        res.status(400).send({ err: 'Failed to remove stay' })
    }
}

export async function addStayMsg(req, res) {
    const { loggedinUser } = req
    const { stayId } = req.params
    try {
        const msg = {
            txt: req.body.txt,
            by: loggedinUser
        }
        const savedMsg = await stayService.addStayMsg(stayId, msg)
        res.json(savedMsg)
    } catch (err) {
        logger.error('Failed to update stay', err)
        res.status(400).send({ err: 'Failed to update stay' })

    }
}

export async function removeStayMsg(req, res) {
    const { loggedinUser } = req
    const { msgId, stayId } = req.params

    try {
        const removedId = await stayService.removeStayMsg(stayId, msgId)
        res.send(removedId)
    } catch (err) {
        logger.error('Failed to remove stay msg', err)
        res.status(400).send({ err: 'Failed to remove stay msg' })
    }
}