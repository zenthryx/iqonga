import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { salesApi } from '../../services/salesApi';
import { toast } from 'react-hot-toast';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult
} from 'react-beautiful-dnd';
import {
  Plus,
  DollarSign,
  Calendar,
  TrendingUp,
  User,
  Building,
  Loader,
  X
} from 'lucide-react';

interface Deal {
  id: string;
  deal_name: string;
  amount: number | null;
  currency: string | null;
  win_probability: number | null;
  close_date: string | null;
  stage_id: string;
  lead_id?: string;
}

interface PipelineStage {
  id: string;
  stage_name: string;
  stage_order: number;
  win_probability: number;
  deals?: Deal[];
}

interface Pipeline {
  id: string;
  pipeline_name: string;
  is_default: boolean;
}

const PipelineBoard: React.FC = () => {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('');

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      loadPipeline(selectedPipeline);
    }
  }, [selectedPipeline]);

  const loadPipelines = async () => {
    try {
      const pipelinesData = await salesApi.getPipelines();
      setPipelines(pipelinesData);
      
      const defaultPipeline = pipelinesData.find(p => p.is_default) || pipelinesData[0];
      if (defaultPipeline) {
        setSelectedPipeline(defaultPipeline.id);
      }
    } catch (error) {
      console.error('Failed to load pipelines:', error);
    }
  };

  const loadPipeline = async (pipelineId: string) => {
    try {
      setLoading(true);
      const [stagesData, dealsData] = await Promise.all([
        salesApi.getPipelineStages(pipelineId),
        salesApi.getDeals({ pipeline_id: pipelineId, status: 'Open' }, 1, 1000)
      ]);
      
      setStages(stagesData.sort((a, b) => a.stage_order - b.stage_order));
      setDeals(dealsData.data);
    } catch (error) {
      console.error('Failed to load pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDealsByStage = (stageId: string): Deal[] => {
    return deals.filter(deal => deal.stage_id === stageId);
  };

  const getStageValue = (stageId: string): number => {
    const stageDeals = getDealsByStage(stageId);
    return stageDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    try {
      await salesApi.moveDealToStage(draggableId, destination.droppableId);
      
      // Optimistic update
      setDeals(prev => 
        prev.map(deal => 
          deal.id === draggableId 
            ? { ...deal, stage_id: destination.droppableId }
            : deal
        )
      );

      toast.success('Deal moved successfully');
    } catch (error) {
      console.error('Failed to move deal:', error);
      toast.error('Failed to move deal');
      // Reload to get correct state
      if (selectedPipeline) {
        loadPipeline(selectedPipeline);
      }
    }
  };

  const openNewDealModal = (stageId: string) => {
    setSelectedStage(stageId);
    setShowNewDealModal(true);
  };

  const formatCurrency = (amount: number | null, currency: string | null = 'USD') => {
    if (amount === null || amount === undefined) return '$0';
    const currencyCode = currency || 'USD';
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (error) {
      // Fallback if currency code is invalid
      return `$${amount.toLocaleString()}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  // Empty state - no pipelines
  if (pipelines.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Pipeline Found</h3>
          <p className="text-gray-400 mb-4">
            You don't have any sales pipelines set up yet. Pipelines are automatically created when you start managing deals.
          </p>
        </div>
      </div>
    );
  }

  // Empty state - no stages in pipeline
  if (stages.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Sales Pipeline</h1>
            <p className="text-gray-400">Manage your deals through the sales stages</p>
          </div>
        </div>
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <Loader className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Stages Found</h3>
          <p className="text-gray-400 mb-4">
            This pipeline doesn't have any stages yet. Stages are automatically created when you set up your sales process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales Pipeline</h1>
          <p className="text-gray-400">Manage your deals through the sales stages</p>
        </div>

        {/* Pipeline Selector */}
        {pipelines.length > 1 && (
          <select
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            {pipelines.map(pipeline => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.pipeline_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Pipeline Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageDeals = getDealsByStage(stage.id);
            const stageValue = getStageValue(stage.id);

            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80 bg-gray-800 rounded-lg"
              >
                {/* Stage Header */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-semibold">{stage.stage_name}</h3>
                    <button
                      onClick={() => openNewDealModal(stage.id)}
                      className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{stageDeals.length} deals</span>
                    <span className="text-green-400 font-semibold">
                      {formatCurrency(stageValue)}
                    </span>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-4 min-h-[500px] ${
                        snapshot.isDraggingOver ? 'bg-gray-750' : ''
                      }`}
                    >
                      {stageDeals.map((deal, index) => (
                        <Draggable
                          key={deal.id}
                          draggableId={deal.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-3 ${
                                snapshot.isDragging ? 'opacity-50' : ''
                              }`}
                            >
                              <div
                                onClick={() => navigate(`/sales/deals/${deal.id}`)}
                                className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 cursor-pointer transition-colors border border-gray-600 hover:border-blue-500"
                              >
                                <h4 className="text-white font-medium mb-2 line-clamp-2">
                                  {deal.deal_name}
                                </h4>

                                <div className="space-y-2">
                                  <div className="flex items-center text-green-400">
                                    <DollarSign className="w-4 h-4 mr-1" />
                                    <span className="font-semibold">
                                      {formatCurrency(deal.amount, deal.currency)}
                                    </span>
                                  </div>

                                  <div className="flex items-center text-gray-400 text-sm">
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                    <span>{deal.win_probability ?? 0}% probability</span>
                                  </div>

                                  <div className="flex items-center text-gray-400 text-sm">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    <span>
                                      {deal.close_date 
                                        ? new Date(deal.close_date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric'
                                          })
                                        : 'No date set'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {stageDeals.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                          <p className="text-sm">No deals in this stage</p>
                          <button
                            onClick={() => openNewDealModal(stage.id)}
                            className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                          >
                            + Add deal
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* New Deal Modal */}
      {showNewDealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Quick Add Deal</h3>
              <button
                onClick={() => setShowNewDealModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-4">
              For full deal details, use the{' '}
              <button
                onClick={() => {
                  setShowNewDealModal(false);
                  navigate('/sales/deals/new');
                }}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                complete deal form
              </button>
            </p>

            <button
              onClick={() => {
                setShowNewDealModal(false);
                navigate(`/sales/deals/new?stage_id=${selectedStage}`);
              }}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Deal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineBoard;
