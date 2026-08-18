const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const { generateChatResponse } = require('../services/geminiService');

// In-memory conversation store for mock mode
const mockConversations = new Map();

// @desc    Send a message to Gemini AI Assistant
// @route   POST /api/chat
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { message, conversationId, preset = 'general', modelName = 'gemini-2.5-flash' } = req.body;
    const userId = req.user._id || req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung tin nhắn.' });
    }

    let conversation = null;

    if (global.dbConnected) {
      if (conversationId) {
        conversation = await Conversation.findOne({ _id: conversationId, user: userId });
      }

      if (!conversation) {
        // Auto-generate title from first 30 chars of prompt
        const titleSnippet = message.trim().slice(0, 32) + (message.length > 32 ? '...' : '');
        conversation = new Conversation({
          user: userId,
          title: titleSnippet,
          preset,
          modelName,
          messages: [],
        });
      }
    } else {
      // Mock store fallback
      if (conversationId && mockConversations.has(conversationId)) {
        conversation = mockConversations.get(conversationId);
      } else {
        const mockId = 'conv_' + Date.now();
        conversation = {
          _id: mockId,
          user: userId,
          title: message.trim().slice(0, 32),
          preset,
          modelName,
          messages: [],
          updatedAt: new Date(),
        };
        mockConversations.set(mockId, conversation);
      }
    }

    // Call Gemini API Service
    const aiResult = await generateChatResponse({
      preset: conversation.preset || preset,
      messages: conversation.messages || [],
      userPrompt: message,
      userId: userId.toString(),
      modelName: conversation.modelName || modelName,
    });

    // Append user & model messages to history
    const userMessageObj = { role: 'user', content: message, timestamp: new Date() };
    const modelMessageObj = { role: 'model', content: aiResult.text, timestamp: new Date() };

    if (global.dbConnected) {
      conversation.messages.push(userMessageObj);
      conversation.messages.push(modelMessageObj);
      conversation.updatedAt = new Date();
      await conversation.save();
    } else {
      conversation.messages.push(userMessageObj);
      conversation.messages.push(modelMessageObj);
      conversation.updatedAt = new Date();
      mockConversations.set(conversation._id, conversation);
    }

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      title: conversation.title,
      preset: conversation.preset,
      modelUsed: aiResult.modelUsed,
      message: aiResult.text,
      usage: aiResult.usage,
      messages: conversation.messages,
    });
  } catch (err) {
    console.error('API Chat Error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Đã xảy ra lỗi khi kết nối tới AI Assistant.',
    });
  }
});

// @desc    Get all conversations for logged in user
// @route   GET /api/chat/conversations
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!global.dbConnected) {
      const userConvs = Array.from(mockConversations.values()).filter(
        c => c.user.toString() === userId.toString()
      );
      return res.status(200).json({ success: true, conversations: userConvs });
    }

    const conversations = await Conversation.find({ user: userId })
      .sort({ updatedAt: -1 })
      .select('_id title preset modelName updatedAt messages');

    return res.status(200).json({ success: true, conversations });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tải danh sách cuộc trò chuyện.' });
  }
});

// @desc    Get single conversation history
// @route   GET /api/chat/conversations/:id
// @access  Private
router.get('/conversations/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!global.dbConnected) {
      const conv = mockConversations.get(req.params.id);
      if (!conv || conv.user.toString() !== userId.toString()) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy cuộc trò chuyện.' });
      }
      return res.status(200).json({ success: true, conversation: conv });
    }

    const conversation = await Conversation.findOne({ _id: req.params.id, user: userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cuộc trò chuyện.' });
    }

    return res.status(200).json({ success: true, conversation });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi khi tải cuộc trò chuyện.' });
  }
});

// @desc    Delete a conversation
// @route   DELETE /api/chat/conversations/:id
// @access  Private
router.delete('/conversations/:id', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    if (!global.dbConnected) {
      mockConversations.delete(req.params.id);
      return res.status(200).json({ success: true, message: 'Đã xóa cuộc trò chuyện.' });
    }

    await Conversation.deleteOne({ _id: req.params.id, user: userId });
    return res.status(200).json({ success: true, message: 'Đã xóa cuộc trò chuyện.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa cuộc trò chuyện.' });
  }
});

// @desc    Rename a conversation
// @route   PATCH /api/chat/conversations/:id
// @access  Private
router.patch('/conversations/:id', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user._id || req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề không được để trống.' });
    }

    if (!global.dbConnected) {
      const conv = mockConversations.get(req.params.id);
      if (conv) conv.title = title.trim();
      return res.status(200).json({ success: true, conversation: conv });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      { title: title.trim(), updatedAt: new Date() },
      { new: true }
    );

    return res.status(200).json({ success: true, conversation });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi khi đổi tên cuộc trò chuyện.' });
  }
});

module.exports = router;
