'use client';
import React, { useEffect, useState } from 'react';
import { UserCheck, X, Check, Clock } from 'lucide-react';
import { CommunityJoinRequest } from '@/types';
import { ApiService } from '@/services/api';

interface CommunityRequestsModalProps {
    isOpen: boolean;
    communityId: string;
    communityName: string;
    onClose: () => void;
    onApproveSuccess: () => void;
}

export default function CommunityRequestsModal({
    isOpen,
    communityId,
    communityName,
    onClose,
    onApproveSuccess,
}: CommunityRequestsModalProps) {
    const [requests, setRequests] = useState<CommunityJoinRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !communityId) return;
        let mounted = true;
        setIsLoading(true);
        ApiService.getCommunityJoinRequests(communityId).then((res) => {
            if (mounted && res.isSuccess && res.data) {
                setRequests(res.data);
            }
            if (mounted) setIsLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, [isOpen, communityId]);

    if (!isOpen) return null;

    const handleApprove = async (reqId: string) => {
        setProcessingId(reqId);
        const res = await ApiService.approveJoinRequest(communityId, reqId);
        if (res.isSuccess) {
            setRequests((prev) => prev.filter((r) => r.id !== reqId));
            onApproveSuccess();
        }
        setProcessingId(null);
    };

    const handleReject = async (reqId: string) => {
        setProcessingId(reqId);
        const res = await ApiService.rejectJoinRequest(communityId, reqId);
        if (res.isSuccess) {
            setRequests((prev) => prev.filter((r) => r.id !== reqId));
        }
        setProcessingId(null);
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                data-testid="community-requests-modal"
                className="bg-white dark:bg-stone-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200/80 dark:border-stone-800 space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 flex items-center justify-center">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                                Join Requests
                            </h2>
                            <p className="text-xs text-stone-500">
                                Pending applicants for {communityName}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        data-testid="btn-requests-close"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-stone-400 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="py-12 text-center text-xs text-stone-400">
                        Loading join applications...
                    </div>
                ) : requests.length === 0 ? (
                    <div className="py-10 text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto">
                            <Check className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                            No pending applications
                        </h3>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {requests.map((req) => (
                            <div
                                key={req.id}
                                data-testid={`request-item-${req.id}`}
                                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                                            {req.displayName}
                                        </h4>
                                        {req.userEmail && (
                                            <p className="text-[11px] text-stone-500">
                                                {req.userEmail}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-stone-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Pending
                                    </span>
                                </div>
                                {req.message && (
                                    <p className="text-xs text-stone-600 mt-2 italic">
                                        {req.message}
                                    </p>
                                )}
                                <div className="flex gap-2 mt-3">
                                    <button
                                        type="button"
                                        data-testid={`btn-approve-${req.id}`}
                                        disabled={processingId === req.id}
                                        onClick={() => handleApprove(req.id)}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        data-testid={`btn-reject-${req.id}`}
                                        disabled={processingId === req.id}
                                        onClick={() => handleReject(req.id)}
                                        className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold cursor-pointer disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
