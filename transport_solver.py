from __future__ import annotations

import sys
import time
from dataclasses import dataclass
from typing import List, Tuple

EPS = 1e-9


@dataclass
class TransportProblem:
    supply: List[float]
    demand: List[float]
    costs: List[List[float]]
    supply_labels: List[str]
    demand_labels: List[str]


def read_positive_int(prompt: str) -> int:
    while True:
        raw = input(prompt).strip()
        try:
            value = int(raw)
            if value <= 0:
                raise ValueError
            return value
        except ValueError:
            print("Введите положительное целое число.")


def read_number_list(prompt: str, expected_length: int) -> List[float]:
    while True:
        raw = input(prompt).strip()
        parts = raw.replace(",", ".").split()
        if len(parts) != expected_length:
            print(f"Введите ровно {expected_length} чисел через пробел.")
            continue
        try:
            return [float(part) for part in parts]
        except ValueError:
            print("Не удалось преобразовать ввод в числа, попробуйте снова.")


def request_problem() -> TransportProblem:
    print("\n=== Ввод данных транспортной задачи ===")
    suppliers = read_positive_int("Количество поставщиков: ")
    supply = read_number_list(
        f"Запасы {suppliers} поставщика(-ов) через пробел: ", suppliers
    )
    consumers = read_positive_int("Количество потребителей: ")
    demand = read_number_list(
        f"Потребности {consumers} потребителя(-ей) через пробел: ", consumers
    )
    supply_labels = [f"S{i + 1}" for i in range(suppliers)]
    demand_labels = [f"C{j + 1}" for j in range(consumers)]
    costs: List[List[float]] = []
    print(
        "Введите матрицу стоимостей построчно (значения через пробел).\n"
        "Например: 4 7 6"
    )
    for i in range(suppliers):
        row = read_number_list(
            f"Стоимость поставок от {supply_labels[i]} к каждому потребителю: ",
            consumers,
        )
        costs.append(row)
    return TransportProblem(supply, demand, costs, supply_labels, demand_labels)


def balance_problem(problem: TransportProblem) -> Tuple[TransportProblem, str | None]:
    supply_total = sum(problem.supply)
    demand_total = sum(problem.demand)
    if abs(supply_total - demand_total) <= EPS:
        return problem, None

    new_supply = list(problem.supply)
    new_demand = list(problem.demand)
    new_costs = [row[:] for row in problem.costs]
    supply_labels = list(problem.supply_labels)
    demand_labels = list(problem.demand_labels)

    if supply_total > demand_total:
        diff = supply_total - demand_total
        new_demand.append(diff)
        demand_labels.append("ПсевдоC")
        for row in new_costs:
            row.append(0.0)
        message = (
            "Система небалансна: предложение превышает спрос. Добавлен "
            "фиктивный потребитель."
        )
    else:
        diff = demand_total - supply_total
        new_supply.append(diff)
        supply_labels.append("ПсевдоS")
        new_row = [0.0 for _ in new_demand]
        new_costs.append(new_row)
        message = (
            "Система небалансна: спрос превышает предложение. Добавлен "
            "фиктивный поставщик."
        )

    balanced = TransportProblem(new_supply, new_demand, new_costs, supply_labels, demand_labels)
    return balanced, message


def northwest_corner(problem: TransportProblem) -> Tuple[List[List[float]], List[Tuple[int, int, float]]]:
    supply = list(problem.supply)
    demand = list(problem.demand)
    rows = len(supply)
    cols = len(demand)
    allocations = [[0.0 for _ in range(cols)] for _ in range(rows)]
    steps: List[Tuple[int, int, float]] = []
    i = 0
    j = 0
    while i < rows and j < cols:
        qty = min(supply[i], demand[j])
        allocations[i][j] = qty
        steps.append((i, j, qty))
        supply[i] -= qty
        demand[j] -= qty
        if abs(supply[i]) <= EPS and abs(demand[j]) <= EPS:
            i += 1
            j += 1
        elif abs(supply[i]) <= EPS:
            i += 1
        else:
            j += 1
    return allocations, steps


def fmt_number(value: float) -> str:
    if abs(value) <= EPS:
        return "0"
    if abs(value - round(value)) <= EPS:
        return str(int(round(value)))
    return f"{value:.2f}"


def format_table(problem: TransportProblem, allocations: List[List[float]], highlight: Tuple[int, int] | None = None) -> str:
    headers = ["Поставщик/Потребитель", *problem.demand_labels, "Запас"]
    demand_footer = ["Спрос", *(fmt_number(d) for d in problem.demand), ""]
    rows_repr: List[List[str]] = []
    for idx, label in enumerate(problem.supply_labels):
        line = [label]
        for jdx, _ in enumerate(problem.demand_labels):
            cell = fmt_number(allocations[idx][jdx])
            if highlight == (idx, jdx) and allocations[idx][jdx] > EPS:
                cell = f"[{cell}]"
            line.append(cell)
        line.append(fmt_number(problem.supply[idx]))
        rows_repr.append(line)

    all_rows = [headers, *rows_repr, demand_footer]
    col_widths = [max(len(row[col]) for row in all_rows) for col in range(len(headers))]

    def render_row(row: List[str]) -> str:
        return " | ".join(cell.ljust(col_widths[idx]) for idx, cell in enumerate(row))

    separator = "-+-".join("-" * width for width in col_widths)
    lines = [render_row(headers), separator]
    for row in rows_repr:
        lines.append(render_row(row))
    lines.append(separator)
    lines.append(render_row(demand_footer))
    return "\n".join(lines)


def animate_solution(problem: TransportProblem, allocations: List[List[float]], steps: List[Tuple[int, int, float]]) -> None:
    partial = [[0.0 for _ in problem.demand] for _ in problem.supply]
    print("\nАнимация шагов метода северо-западного угла:")
    total_steps = len(steps)
    for idx, (row, col, qty) in enumerate(steps, start=1):
        partial[row][col] = qty
        print(f"\nШаг {idx}/{total_steps}: {problem.supply_labels[row]} -> {problem.demand_labels[col]} = {fmt_number(qty)}")
        print(format_table(problem, partial, highlight=(row, col)))
        progress = idx / total_steps
        bar_width = 30
        filled = int(progress * bar_width)
        bar = "#" * filled + "." * (bar_width - filled)
        sys.stdout.write(f"Прогресс: [{bar}] {int(progress * 100)}%\n")
        sys.stdout.flush()
        time.sleep(0.9)


def compute_total_cost(problem: TransportProblem, allocations: List[List[float]]) -> float:
    total = 0.0
    for i, row in enumerate(allocations):
        for j, qty in enumerate(row):
            total += qty * problem.costs[i][j]
    return total


def main() -> None:
    problem = request_problem()
    balanced_problem, note = balance_problem(problem)
    if note:
        print(f"\n{note}")
        print("Добавленные фиктивные участники имеют нулевые тарифы.")
    else:
        print("\nСистема уже сбалансирована, переходим к поиску решения.")

    allocations, steps = northwest_corner(balanced_problem)
    animate_solution(balanced_problem, allocations, steps)
    print("\nОпорное решение (итоговая таблица):")
    print(format_table(balanced_problem, allocations))
    total_cost = compute_total_cost(balanced_problem, allocations)
    print(f"\nСуммарная стоимость перевозок: {total_cost:.2f}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nРабота прервана пользователем.")
