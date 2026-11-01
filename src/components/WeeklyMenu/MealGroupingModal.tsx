import React, { useState } from 'react';
import { X, Users, User, Plus, Trash2, Check, Sparkles, Layers } from 'lucide-react';
import { Person, MealGroup, MealType } from '../../types.ts';

interface MealGroupingModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayLabel: string;
  mealType: MealType;
  members: Person[];
  currentGroups: MealGroup[];
  onSaveGroups: (groups: MealGroup[]) => void;
}

export const MealGroupingModal: React.FC<MealGroupingModalProps> = ({
  isOpen,
  onClose,
  dayLabel,
  mealType,
  members,
  currentGroups,
  onSaveGroups,
}) => {
  if (!isOpen) return null;

  // Initialize draft groups
  const [groups, setGroups] = useState<MealGroup[]>(() => {
    if (currentGroups && currentGroups.length > 0) {
      return currentGroups.map((g) => ({
        ...g,
        memberIds: [...g.memberIds],
        dishes: [...g.dishes],
      }));
    }
    // Default: all together
    return [
      {
        id: `grp_${Date.now()}`,
        memberIds: members.map((m) => m.id),
        dishes: [],
      },
    ];
  });

  const memberMap = new Map<string, Person>();
  members.forEach((m) => memberMap.set(m.id, m));

  const allDishes = groups.flatMap((g) => g.dishes);

  // PRESET 1: All together
  const handleSetAllTogether = () => {
    setGroups([
      {
        id: `grp_together_${Date.now()}`,
        memberIds: members.map((m) => m.id),
        dishes: allDishes,
      },
    ]);
  };

  // PRESET 2: All separate (1 by 1)
  const handleSetAllSeparate = () => {
    setGroups(
      members.map((m, idx) => ({
        id: `grp_${m.id}_${Date.now()}_${idx}`,
        memberIds: [m.id],
        dishes: idx === 0 ? allDishes : [],
      }))
    );
  };

  // PRESET: Set explicit member partition
  const handleApplyPartition = (partition: string[][]) => {
    setGroups(
      partition.map((memberIds, idx) => ({
        id: `grp_part_${Date.now()}_${idx}`,
        memberIds,
        dishes: idx === 0 ? allDishes : [],
      }))
    );
  };

  // Move a member to target group
  const handleMoveMember = (memberId: string, targetGroupId: string) => {
    setGroups((prev) => {
      return prev
        .map((g) => {
          if (g.id === targetGroupId) {
            if (!g.memberIds.includes(memberId)) {
              return { ...g, memberIds: [...g.memberIds, memberId] };
            }
            return g;
          } else {
            return { ...g, memberIds: g.memberIds.filter((id) => id !== memberId) };
          }
        })
        .filter((g) => g.memberIds.length > 0 || g.id === targetGroupId);
    });
  };

  // Add new empty group
  const handleAddNewGroup = () => {
    const newId = `grp_new_${Date.now()}`;
    setGroups((prev) => [
      ...prev,
      {
        id: newId,
        memberIds: [],
        dishes: [],
      },
    ]);
  };

  // Remove a group and move its members to another group
  const handleRemoveGroup = (groupId: string) => {
    if (groups.length <= 1) return;
    const targetGroup = groups.find((g) => g.id === groupId);
    const otherGroup = groups.find((g) => g.id !== groupId)!;
    if (!targetGroup) return;

    setGroups((prev) =>
      prev
        .filter((g) => g.id !== groupId)
        .map((g) =>
          g.id === otherGroup.id
            ? {
                ...g,
                memberIds: [...g.memberIds, ...targetGroup.memberIds],
                dishes: [...g.dishes, ...targetGroup.dishes],
              }
            : g
        )
    );
  };

  const handleSave = () => {
    // Ensure all members are assigned somewhere
    const assignedIds = new Set(groups.flatMap((g) => g.memberIds));
    const unassigned = members.filter((m) => !assignedIds.has(m.id));

    let finalGroups = groups.filter((g) => g.memberIds.length > 0);
    if (unassigned.length > 0) {
      if (finalGroups.length > 0) {
        finalGroups[0].memberIds.push(...unassigned.map((m) => m.id));
      } else {
        finalGroups = [
          {
            id: `grp_${Date.now()}`,
            memberIds: members.map((m) => m.id),
            dishes: [],
          },
        ];
      }
    }

    onSaveGroups(finalGroups);
    onClose();
  };

  const num = members.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-app-card rounded-2xl border border-app-subtle shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-app-subtle flex items-center justify-between bg-app-muted/30">
          <div>
            <h3 className="font-bold text-sm text-app-main leading-tight">
              Organizza chi mangia con chi
            </h3>
            <p className="text-xs text-app-muted">
              {dayLabel} · {mealType === 'pranzo' ? 'Pranzo' : 'Cena'} ({num} persone associate a questa casa)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-app-muted hover:text-app-main hover:bg-app-muted cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Quick Presets Section */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-app-muted block">
              Configurazioni Rapide a Tavola:
            </span>

            {/* Standard Presets: Tutti insieme vs Tutti soli */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSetAllTogether}
                className="py-2.5 px-3 rounded-xl border border-app-subtle hover:border-app-primary hover:bg-app-primary-light/50 transition-colors text-app-main font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4 text-app-primary shrink-0" />
                <span className="truncate">👫 Tutti Insieme ({num})</span>
              </button>

              <button
                type="button"
                onClick={handleSetAllSeparate}
                className="py-2.5 px-3 rounded-xl border border-app-subtle hover:border-app-primary hover:bg-app-primary-light/50 transition-colors text-app-main font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">🔀 Tutti Soli (1 a 1)</span>
              </button>
            </div>

            {/* SPECIAL CASE: 3 PERSONS (1 mangia sola e 2 insieme) */}
            {num === 3 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider block mb-1.5">
                  Oppure: 1 mangia da solo/a e 2 mangiano insieme:
                </span>
                <div className="space-y-1.5">
                  {members.map((aloneMember) => {
                    const togetherMembers = members.filter((m) => m.id !== aloneMember.id);
                    return (
                      <button
                        key={aloneMember.id}
                        type="button"
                        onClick={() =>
                          handleApplyPartition([
                            [aloneMember.id],
                            togetherMembers.map((m) => m.id),
                          ])
                        }
                        className="w-full p-2 rounded-xl border border-app-subtle bg-app-card hover:bg-app-muted hover:border-app-primary transition-all text-left flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold text-[11px]">
                            {aloneMember.avatar} {aloneMember.name} da solo/a
                          </span>
                          <span className="text-app-muted text-xs">+</span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px]">
                            {togetherMembers.map((m) => `${m.avatar} ${m.name}`).join(' & ')} insieme
                          </span>
                        </div>
                        <span className="text-[10px] text-app-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          Applica →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SPECIAL CASE: 4 PERSONS (a due a due, o 3 insieme e 1 solo) */}
            {num === 4 && (
              <div className="space-y-2 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider block mb-1.5">
                    A due a due (2 mangiano insieme + 2 mangiano insieme):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyPartition([
                          [members[0].id, members[1].id],
                          [members[2].id, members[3].id],
                        ])
                      }
                      className="p-2 rounded-xl border border-app-subtle bg-app-card hover:bg-app-muted hover:border-app-primary transition-all text-left cursor-pointer"
                    >
                      <div className="font-semibold text-[11px] text-app-main">
                        [{members[0].name} & {members[1].name}] + [{members[2].name} & {members[3].name}]
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApplyPartition([
                          [members[0].id, members[2].id],
                          [members[1].id, members[3].id],
                        ])
                      }
                      className="p-2 rounded-xl border border-app-subtle bg-app-card hover:bg-app-muted hover:border-app-primary transition-all text-left cursor-pointer"
                    >
                      <div className="font-semibold text-[11px] text-app-main">
                        [{members[0].name} & {members[2].name}] + [{members[1].name} & {members[3].name}]
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-app-muted uppercase tracking-wider block mb-1.5">
                    3 insieme e 1 solo/a:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {members.map((aloneMember) => {
                      const trio = members.filter((m) => m.id !== aloneMember.id);
                      return (
                        <button
                          key={aloneMember.id}
                          type="button"
                          onClick={() =>
                            handleApplyPartition([
                              [aloneMember.id],
                              trio.map((m) => m.id),
                            ])
                          }
                          className="p-2 rounded-xl border border-app-subtle bg-app-card hover:bg-app-muted hover:border-app-primary transition-all text-left cursor-pointer"
                        >
                          <span className="font-semibold text-[11px] text-app-main block">
                            👤 {aloneMember.name} da solo/a
                          </span>
                          <span className="text-[10px] text-app-muted">
                            + {trio.map((m) => m.name).join(', ')} insieme
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Custom Interactive Groups Organizer */}
          <div className="space-y-3 pt-3 border-t border-app-subtle">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-app-main flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-app-primary" />
                <span>Gruppi a Tavola ({groups.length}):</span>
              </span>
              <button
                type="button"
                onClick={handleAddNewGroup}
                className="text-[11px] font-semibold text-app-primary hover:bg-app-primary-light px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer border border-dashed border-app-primary/40"
              >
                <Plus className="w-3.5 h-3.5" /> Nuovo Gruppo
              </button>
            </div>

            <div className="space-y-2.5">
              {groups.map((group, gIdx) => {
                const groupMembers = group.memberIds
                  .map((id) => memberMap.get(id))
                  .filter(Boolean) as Person[];

                const isSingle = groupMembers.length === 1;

                return (
                  <div
                    key={group.id}
                    className="p-3 rounded-xl border border-app-subtle bg-app-muted/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-app-main flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-app-card border border-app-subtle flex items-center justify-center text-[10px] text-app-primary font-bold">
                          {gIdx + 1}
                        </span>
                        {isSingle ? (
                          <span>Mangia da solo/a: <strong>{groupMembers[0]?.name}</strong></span>
                        ) : groupMembers.length > 1 ? (
                          <span>Mangiano insieme: <strong>{groupMembers.map((m) => m.name).join(' & ')}</strong></span>
                        ) : (
                          <span className="text-amber-600 italic">Gruppo vuoto</span>
                        )}
                      </span>

                      {groups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveGroup(group.id)}
                          className="text-app-muted hover:text-rose-500 p-1 rounded-md cursor-pointer transition-colors"
                          title="Elimina gruppo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Member chips in this group */}
                    <div className="flex flex-wrap gap-1.5 min-h-[34px] p-1.5 rounded-lg bg-app-card border border-app-subtle/60 items-center">
                      {groupMembers.length === 0 ? (
                        <span className="text-[11px] text-app-muted italic px-1">
                          Nessun membro. Tocca "+ [Nome]" qui sotto per aggiungerlo.
                        </span>
                      ) : (
                        groupMembers.map((m) => (
                          <div
                            key={m.id}
                            className="px-2.5 py-1 rounded-lg bg-app-primary-light text-app-primary border border-app-primary-border flex items-center gap-1.5 text-xs font-semibold"
                          >
                            <span>{m.avatar}</span>
                            <span>{m.name}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Quick Move Buttons */}
                    {groups.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1 text-[11px] pt-0.5">
                        <span className="text-app-muted text-[10px] mr-1">Sposta in questo gruppo:</span>
                        {members
                          .filter((m) => !group.memberIds.includes(m.id))
                          .map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleMoveMember(m.id, group.id)}
                              className="px-2 py-0.5 rounded-md bg-app-card hover:bg-app-muted border border-app-subtle text-app-main font-medium cursor-pointer transition-colors"
                            >
                              + {m.avatar} {m.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-app-muted/30 border-t border-app-subtle flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-app-muted hover:bg-app-muted rounded-xl cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 font-bold bg-app-primary text-white rounded-xl hover:opacity-90 transition-opacity shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Conferma Disposizione ({groups.length} {groups.length === 1 ? 'gruppo' : 'gruppi'})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
