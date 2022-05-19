"use strict"

class Graph {
    constructor() {
        this.graph = [];
        this.nodes = [];
        this.nodeId = 0;
        this.removedId = [];
        this.listWeight = [];
        this.isOriented = false;
        this.isWeighted = false;
        cytoscape.use(cytoscapePopper);
        this.viewGraph = cytoscape({
            container: document.getElementById('graph'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'content': 'data(id)',
                        'text-valign': 'center',
                        'width': 40,
                        'height': 40,
                        'background-color': '#ccc'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#6d6d6d',
                        'target-arrow-color': '#6d6d6d',
                        'curve-style': 'bezier',
                    }
                }
            ],
            selectionType: 'single',
            zoomingEnabled: false,
            layout: {
                name: 'grid'
            }
        });
    }

    addNode() {
        const idNode = this.removedId.length ? this.removedId.shift() : this.nodeId;
        this.nodeId++;
        this.viewGraph.add({
            data: {id: idNode},
            position: {x: 200, y: 200}
        });
        this.nodes.push(idNode);
    }

    addEdge(nodeSource, nodeTarget) {
        if (this.checkAddEdge(nodeSource.data().id, nodeTarget.data().id)) {
            const newEdge = this.viewGraph.add({group: 'edges', data: {source: nodeSource.data().id, target: nodeTarget.data().id}});
            if (!this.graph[nodeSource.data().id]) {
                this.graph[nodeSource.data().id] = [];
            }
            if (!this.graph[nodeTarget.data().id]) {
                this.graph[nodeTarget.data().id] = [];
            }
            this.graph[nodeSource.data().id].push(nodeTarget.data().id);
            if (!this.isOriented) {
                this.graph[nodeTarget.data().id].push(nodeSource.data().id);
            }
            if (this.isWeighted) {
               this.addWeight(newEdge, 1);
            }
            return newEdge;
        }
    }

    addWeight(edge, weight) {
        const source = edge.data().source;
        const target = edge.data().target;
        this.listWeight.forEach((element) => {
            if (element.start === source && element.end === target) {
                element.weight = weight;
            }
            if (!this.isOriented && element.start === target && element.end === source) {
                element.weight = weight;
            }
        });
        this.listWeight.push({start: source, end: target, weight});
        if (!this.isOriented) {
            this.listWeight.push({start: target, end: source, weight});
        }
    }

    removeElement(element) {
        if (element.group() === 'nodes') {
            const id = this.nodes.findIndex(item => item === Number(element.data().id));
            this.removedId.push(id);
            this.graph[this.nodes[id]]?.forEach(node => {
                const idRemoveItem = this.graph[node].findIndex(item => Number(item) === Number(element.data().id));
                this.graph[node].splice(idRemoveItem, 1);
            });
            this.graph[this.nodes[id]] = [];
            this.nodes.splice(id, 1);
            this.listWeight = this.listWeight.filter(edge =>
            {
                const flag = edge.start !== element.data().id && edge.end !== element.data().id;
                if (!flag && this.isWeighted) {
                    const removeEdge = this.viewGraph.edges().find(element =>
                        element.data().source === edge.start && element.data().target === edge.end ||
                        element.data().target === edge.start && element.data().source=== edge.end);
                    const weightedEdge = $(`.${removeEdge.data('id')}`)[0];
                    if (weightedEdge) {
                        weightedEdge.remove();
                    }
                }
                return flag;
            });
        } else {
            const target = element.data().target;
            const source = element.data().source;
            const idForTarget = this.graph[target].findIndex(item => Number(item) === Number(source));
            const idForSource = this.graph[source].findIndex(item => Number(item) === Number(target));
            this.graph[target].splice(idForTarget, 1);
            this.graph[source].splice(idForSource, 1);
            if (this.isOriented) {
                const removeIndex = this.listWeight.findIndex(edge => edge.start === element.data('source') && edge.end === element.data('target'));
                this.listWeight.splice(removeIndex, 1);
            } else {
                this.listWeight = this.listWeight.filter(edge =>
                    edge.start !== element.data('source') && edge.end !== element.data('target') ||
                    edge.start !== element.data('target') && edge.end !== element.data('source'));
            }
            if (this.isWeighted) {
                const weightedEdge = $(`.${element.data('id')}`)[0];
                if (weightedEdge) {
                    weightedEdge.remove();
                }
            }

        }
        this.viewGraph.remove(element);
    }

    checkAddEdge(source, target) {
        return !this.viewGraph.edges().find(edge => {
            const data = edge.data();
            const dataNodes = [data.source, data.target];
            if (this.isOriented) {
                return data.source === source && data.target === target;
            }
            return dataNodes.includes(target) && dataNodes.includes(source);
        });
    }

    bfs(start) {
        let queue = [];
        queue.push(start);
        let visited = Array(this.graph.length).fill(false);
        visited[start] = true;
        const path = [];
        while (queue.length) {
            const shift = queue.shift();
            path.push(this.viewGraph.elements(`node#${shift}`));
            const temp = this.graph[shift];
            for (let i = 0; i < temp.length; i++) {
                if (!visited[temp[i]]) {
                    visited[temp[i]] = true;
                    queue.push(temp[i]);
                }
            }
        }
        return path;
    }

    dfs(vertex) {
        let visited = Array(this.graph.length).fill(false);
        const path = [];
        path.push(this.viewGraph.elements(`node#${vertex}`));
        this.dfsSearch(vertex, visited, path);
        return path;
    }

    dfsSearch(vertex, visited, path) {
        visited[vertex] = true;
        path.push(this.viewGraph.elements(`node#${vertex}`));
        const temp = this.graph[vertex];
        for (let i = 0; i < temp.length; i++) {
            if (!visited[temp[i]]) {
                this.dfsSearch(temp[i], visited, path);
            }
        }
    }

    dijkstra(vertex) {
        const distance = Array(this.graph.length).fill(Infinity);
        const visited = Array(this.graph.length).fill(false);
        const path = [];
        distance[vertex] = 0;
        const matrixWeight = this.isWeighted ? this.getMatrixWeight() : this.getDefaultWeight();
        for (let i = 0; i < this.graph.length; i++) {
            const pathVertex = [];
            let vertex = -1;
            for (let j = 0; j < this.graph.length; j++) {
                if (!visited[j] && (vertex === -1 || distance[j] < distance[vertex]))
                    vertex = j;
            }
            if (distance[vertex] !== Infinity) {
                visited[vertex] = true;

                for (let j = 0; j < this.graph[vertex].length; j++) {
                    let temp = this.graph[vertex][j];
                    if (visited[temp]) continue;
                    let weight = matrixWeight[vertex][temp];
                    if (distance[vertex] + weight < distance[temp]) {
                        distance[temp] = distance[vertex] + weight;
                    }
                    pathVertex.push({
                        end: this.viewGraph.elements(`node#${temp}`),
                        weight: distance[vertex] + weight !== distance[temp] ? null : distance[temp] // поменять
                    });
                }
            }
            path.push({
                start: this.viewGraph.elements(`node#${vertex}`),
                path: pathVertex
            });
            console.log(path);
        }
        return path;
    }

    bellmanFord(vertex) {
        const listEdge = this.getListOfEdge();
        const matrixWeight = this.isWeighted ? this.getMatrixWeight() : this.getDefaultWeight();
        const distance = Array(this.graph.length).fill(Infinity);
        distance[vertex] = 0;
        const path = [];
        for (; ;) {
            let flag = false;
            for (let j = 0; j < listEdge.length; j++) {
                if (distance[listEdge[j].start] < Infinity) {
                    if (distance[listEdge[j].end] > distance[listEdge[j].start] + matrixWeight[listEdge[j].start][listEdge[j].end]) {
                        distance[listEdge[j].end] = distance[listEdge[j].start] + matrixWeight[listEdge[j].start][listEdge[j].end];
                        path.push({
                            start: this.viewGraph.elements(`node#${listEdge[j].start}`),
                            end: this.viewGraph.elements(`node#${listEdge[j].end}`),
                            distance: distance[listEdge[j].end]});
                        flag = true;
                    }
                }
            }
            if (!flag) break;
        }
        console.log(distance);
        return path;
    }

    floydWarshall() {
        let matrixMinDistant = this.isWeighted ? this.getMatrixWeight() : this.getDefaultWeight();
        matrixMinDistant = matrixMinDistant.map((item, index) => {
            const temp = item.slice();
            temp[index] = 0;
            return temp;
        });
        for (let i = 0; i < this.graph.length; i++) {
            for (let j = 0; j < this.graph.length; j++) {
                for (let k = 0; k < this.graph.length; k++) {
                    if (matrixMinDistant[j][i] < Infinity && matrixMinDistant[i][k] < Infinity) {
                        matrixMinDistant[j][k] = Math.min(matrixMinDistant[j][k], matrixMinDistant[j][i] + matrixMinDistant[i][k])
                    }
                }
            }
        }
        return matrixMinDistant;
    }

    prima() {
        const matrixWeight = this.isWeighted ? this.getMatrixWeight() : this.getDefaultWeight();
        const minEdge = Array(this.graph.length).fill(Infinity);
        const visited = Array(this.graph.length).fill(false);
        const selectedEdge = Array(this.graph.length).fill(-1);
        minEdge[0] = 0
        for (let i = 0; i < this.graph.length - 1; i++)
        {
            let vertex = -1;
            for (let j = 0 ; j < this.graph.length; j++) {
                if (!visited[j] && (vertex === -1 || minEdge[j] < minEdge[vertex]))
                    vertex = j;
            }

            if (minEdge[vertex] !== Infinity) {
                visited[vertex] = true;
                for (let to = 0; to < this.graph.length; to++) {
                    if (matrixWeight[vertex][to] < minEdge[to]) {
                        minEdge[to] = matrixWeight[vertex][to];
                        selectedEdge[to] = vertex;
                    }
                }
            }
        }
        return selectedEdge;
    }

    getDefaultWeight() {
        const matrixWeight = [];
        this.graph.forEach((nodes, index) => {
            matrixWeight[index] = Array(this.graph.length).fill(Infinity);
            nodes.forEach(node => {
                matrixWeight[index][node] = 1;
            });
        });
        return matrixWeight;
    }

    getMatrixWeight() {
        const matrixWeight = new Array(this.graph.length);
        this.listWeight.forEach(item => {
            if (!matrixWeight[item.start]) {
                matrixWeight[item.start] = Array(this.graph.length).fill(Infinity);
            }
            if (!matrixWeight[item.end]) {
                matrixWeight[item.end] = Array(this.graph.length).fill(Infinity);
            }
            matrixWeight[item.start][item.end] = Number(item.weight);
        });
        return matrixWeight;
    }

    getListOfEdge() {
        const listEdge = [];
        this.graph.forEach((item, index) => {
            item.forEach(node => {
                listEdge.push({start: index, end: node});
            });
        });
        return listEdge;
    }
}

