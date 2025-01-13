import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hook';
import {
    fetchConversationsThunk,
    createConversationThunk,
    updateConversationThunk,
    queryConversationsThunk,
    generateConversationReportThunk,
} from '../slices/conversationsSlice';
import { RootState } from '../../store';
import { Conversation } from '../types/conversation.types';

export const useConversations = () => {
    const dispatch = useAppDispatch();

    // Extract state data
    const { conversations, loading, error, generateReportLoading, generateReportError } = useAppSelector((state: RootState) => state.conversations);

    // Fetch all conversations
    const fetchConversations = useCallback(() => {
        dispatch(fetchConversationsThunk());
    }, [dispatch]);

    // Create a new conversation
    const createConversation = useCallback((id: string, title: string, created_by: string, type: string) => {
        return dispatch(createConversationThunk({ id: id, title: title, created_by: created_by, type: type }));
    }, [dispatch]);

    // Update an existing conversation
    const updateConversation = useCallback((conversationId: string, updatedFields: Partial<Conversation>) => {
        return dispatch(updateConversationThunk({ conversationId, updatedFields }));
    }, [dispatch]);

    // Query conversations with filters
    const queryConversations = useCallback(
        (filters: { user_id?: string; created_by?: string; title?: string; page?: number; page_size?: number }) => {
            return dispatch(queryConversationsThunk(filters));
        },
        [dispatch]
    );

    const generateConversationReport = useCallback(
        (conversationId: string) => {
            return dispatch(generateConversationReportThunk(conversationId));
        },
        [dispatch]
    );

    // Automatically fetch conversations on initialization
    useEffect(() => {
        if (!conversations.length) {
            fetchConversations();
        }
    }, [fetchConversations, conversations.length]);

    return {
        conversations,
        loading,
        error,
        generateReportLoading,
        generateReportError,
        fetchConversations,
        createConversation,
        updateConversation,
        queryConversations,
        generateConversationReport,
    };
};
