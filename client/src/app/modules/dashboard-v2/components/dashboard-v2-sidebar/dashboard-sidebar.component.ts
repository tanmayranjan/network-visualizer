import { Component, OnInit, Output, EventEmitter, Input, OnChanges } from '@angular/core';
import { GraphDataService } from 'src/app/modules/core/services/graph-data-service/graph-data.service';
import { Network, DataSet, Node, Edge, IdType } from 'vis';
import { SharedGraphService } from 'src/app/modules/core/services/shared-graph.service';
import { Subscription } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import * as _ from 'lodash';
import { SearchService } from 'src/app/modules/shared/services/search-service/search.service';
@Component({
  selector: 'app-dashboard-sidebar',
  templateUrl: './dashboard-sidebar.component.html',
  styleUrls: ['./dashboard-sidebar.component.scss']
})
export class DashboardSidebarComponent implements OnInit, OnChanges {

  @Input() newNodeCreated: string;
  // tslint:disable-next-line: no-input-rename
  @Input('nodeLimitEnterEvent') nodeLimitOnEnter: any = null;
  private showDisabled = false;
  public rotateObj = {
    Name: {
      rotate: false,
      color: '#D2E5FE'
    },
    Type: {
      rotate: false,
      color: '#D2E5FE'
    },
    Represent: {
      rotate: false,
      color: '#D2E5FE'
    },
    Connection: {
      rotate: false,
      color: '#D2E5FE'
    },
    Status: {
      rotate: false,
      color: '#D2E5FE'
    },
    Understanding: {
      rotate: false,
      color: '#D2E5FE'
    },
    Url: {
      rotate: false,
      color: '#D2E5FE'
    }
  };
  defaultColor = {
    Academia : 'c_ff4444',
    Consulting : 'c_ffbb33',
    Government : 'c_00C851',
    'Impact Investor' : 'c_33b5e5',
    'International Agency' : 'c_CC0000',
    Media : 'c_FF8800',
    'NGO/CBO' : 'c_007E33',
    People : 'c_0099CC',
    Philanthropy : 'c_9933CC',
    Platform : 'c_0d47a1',
    'Private Sector' : 'c_2BBBAD',
    'Research Institute' : 'c_c51162'
    };
  @Output() eventClicked = new EventEmitter<string>();
  @Output() nodeTypesEvent = new EventEmitter<Array<any>>();
  nameOptions: Array<string> = [];
  relationOptions: Array<string> = [];
  typeOptions: Array<string> = [];
  representOptions: Array<string> = [];
  connectionOptions: Array<string> = [];
  statusOptions: Array<string> = [];
  understandingOptions: Array<string> = [];
  urlOptions: Array<string> = [];
  selectedRelationship: { type: string }[] = [];
  selectedName: Array<string> = [];
  selectedRelation: Array<string> = [];
  selectedType: Array<string> = [];
  selectedRepresent: Array<string> = [];
  selectedConnection: Array<string> = [];
  selectedStatus: Array<string> = [];
  selectedUnderstanding: Array<string> = [];
  selectedUrl: Array<string> = [];
  selectedGraph: { type: string, value: Array<string> }[] = [];
  public graphData = {};
  count  = 1;
  relstatus = false;
  preSelectedRel: string;

  edgesNewObject: { type: string, nodeid: Array<number> }[] = [];
  nodesNewObject: { type: string, nodeid: Array<number> }[] = [];
  graphInitData: Array<object> = [];

  public totalNodesProperties = {};
  public totalRelationsProperties = {};
  public processedData;
  public nodeTypes2: Array<any> = [];

  public relationTypeOptions: Array<any> = [];
  public relationsData: any;
  // Query to fetch all labels
  public queryObj = {
    raw: true,
    query: `MATCH (p) WITH DISTINCT keys(p) AS keys,p
     with DISTINCT labels(p) as label,keys 
     UNWIND keys AS keyslisting WITH DISTINCT keyslisting AS allfields,label
     RETURN collect(allfields),label`
  };
  
  constructor(private graphDataService: GraphDataService, private sharedGraphData: SharedGraphService, private searchService: SearchService) { }

  ngOnInit() {
    this.getGraph();
  }

   ngOnChanges() {
    // update all dropdown when new node is created
    // get the createdEvent
    if (this.newNodeCreated) {
      const nodeEvent = this.newNodeCreated.split('_')[0];

      if (nodeEvent === 'NodeEvent') {
        this.getGraph();
      }
    }
    // detect if the user hit enter while entering the nodelimit value
    if (!!this.nodeLimitOnEnter && !isNaN(this.nodeLimitOnEnter)) {
      // user pressed entered after filling a valid number
      console.log('enter detected after ', this.nodeLimitOnEnter);
      this.searchGraph();
    }
    }

  // set all data in sidebar dropdown
  getGraph() {
    // fetch the properties of all the nodes and relationships
    this.graphDataService.getGraphProperties()
      .subscribe(response => {
        if (response.hasOwnProperty('nodes')) {
          this.totalNodesProperties = _.cloneDeep(response['nodes']);
          this.sharedGraphData.setNodeProperties(this.totalNodesProperties);
          let temname = [];
          let temstatus = [];
          let temrepresent = [];
          let temconnection = [];
          let temunder = [];
          if (this.totalNodesProperties) {
            Object.keys(this.totalNodesProperties).forEach(keyName => {
              if(keyName === "Name"){
                temname = this.totalNodesProperties['Name'];
              }else if(keyName === "Status"){
                temstatus = this.totalNodesProperties['Status'];
              }else if(keyName === "Represent"){
                temrepresent = this.totalNodesProperties['Represent'];
              }else if(keyName === "Connection"){
                temconnection = this.totalNodesProperties['Connection'];
              }else if(keyName === "Understanding of SP Thinking"){
                temunder = this.totalNodesProperties['Understanding of SP Thinking'];
              }
          });
          }
          this.representOptions = temrepresent;
          this.connectionOptions = temconnection;
          this.understandingOptions = temunder;
          this.statusOptions = temstatus;
          this.nameOptions = temname;
        if (response.hasOwnProperty('relations')) {
          this.totalRelationsProperties = _.cloneDeep(response['relations']);
          this.sharedGraphData.setRelationProperties(this.totalRelationsProperties);
        }
        console.log(this.totalNodesProperties, this.totalRelationsProperties);
     }
     }, err => {
        console.error('Error while subscribing to graphProperties method -> ', err);
      });

     this.getNodeTypes().subscribe(data=>{
       this.sharedGraphData.setProcessedData(this.processedData);
       this.sharedGraphData.setNodeTypes2(this.nodeTypes2);
       this.typeOptions = this.nodeTypes2;
     });
       
   this.getRelationTypes().subscribe(response => {
      // this.graphInitData.push(data);
     this.relationOptions = this.relationTypeOptions;
    });
    }

  onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  searchGraph() {
    let requestBody;
    // tslint:disable-next-line: max-line-length
    if (
      this.selectedName.length > 0 || this.selectedType.length > 0 ||
      this.selectedConnection.length > 0 || this.selectedRepresent.length > 0 ||
      this.selectedStatus.length > 0 || this.selectedUnderstanding.length > 0
      ) {
      this.selectedGraph = [];
      if ( this.selectedName.length > 0 ) {
        this.selectedGraph.push({ type: 'Name', value: this.selectedName });
      }
      if ( this.selectedType.length > 0 ) {
        this.selectedGraph.push({ type: 'Type', value: this.selectedType });
      }
      if ( this.selectedConnection.length > 0 ) {
        this.selectedGraph.push({ type: 'Connection', value: this.selectedConnection });
      }
      if ( this.selectedRepresent.length > 0 ) {
        this.selectedGraph.push({ type: 'Represent', value: this.selectedRepresent });
      }
      if ( this.selectedStatus.length > 0 ) {
        this.selectedGraph.push({ type: 'Status', value: this.selectedStatus });
      }
      if ( this.selectedUnderstanding.length > 0 ) {
        this.selectedGraph.push({ type: 'Understanding of SP Thinking', value: this.selectedUnderstanding });
      }
      if ( this.selectedUrl.length > 0 ) {
        this.selectedGraph.push({ type: 'Url', value: this.selectedUrl });
      }
      requestBody = { nodes: this.selectedGraph };
    } else {
      // if no selected element
      requestBody = { };
    }
    this.sharedGraphData.setGraphData(requestBody);
    if (this.count === 1) {
      this.eventClicked.emit('search' + this.count);
      this.count = 2;
      } else {
        this.eventClicked.emit('search' + this.count);
        this.count = 1;
      }

  }

  // Method gives new edgesArray with related node ids
  getRelatedNodeIdArrayFromEdges(selectedNodeId) {
    if (this.graphInitData.length > 0) {
      // console.log('rel',this.relationOptions);
      let temArray = [];
      this.graphInitData[0]['seperateEdges'].filter(edge => {
        if (selectedNodeId === edge.from) {
          temArray.push(edge.to);
        } else if (selectedNodeId === edge.to) {
          temArray.push(edge.from);
        }
      });
      temArray = temArray.filter(this.onlyUnique);
      return temArray;
    }
  }
  // Method gives selected node id
  getSelectedNodeId(nodeName) {
    let temId;
    if (this.graphInitData.length > 0) {
      this.graphInitData[0]['seperateNodes'].filter(node => {
        if (nodeName === node.label) {
          temId = node.id;
        }
      });
      return temId;
    }
  }

  searchElement() {
    let temdep = [];
    let temper = [];
    //   if(this.graphInitData.length>0){
    //   if(this.selectedName.length>0){
    //     this.selectedName.filter(name=>{
    //       let selectedNodeId=this.getSelectedNodeId(name);
    //       console.log('id',selectedNodeId);
    //       let temNewRelatedNodeId = this.getRelatedNodeIdArrayFromEdges(selectedNodeId);
    //       console.log('new',temNewRelatedNodeId);
    //       if(temNewRelatedNodeId){
    //         temNewRelatedNodeId.filter(id=>{
    //           this.graphInitData[0]['seperateNodes'].filter(node=>{
    //           if(id === node.id && node.type[0] === 'Department'){
    //             temdep.push(node.label);
    //           }else if(id === node.id && node.type[0] === 'Person'){
    //             temper.push(node.label);
    //             }
    //           });
    //         });
    //       }         
    //      });
    //      temdep = temdep.filter(this.onlyUnique);
    //      temper = temper.filter(this.onlyUnique);
    //     this.typeOptions = temdep;
    //     this.representOptions = temper;
    //   }
    // }

  }

  resetGraph() {
    this.getGraph();
    this.selectedName = [];
    this.selectedType = [];
    this.selectedRepresent = [];
    this.selectedStatus = [];
    this.selectedConnection = [];
    this.selectedUnderstanding = [];
    this.selectedUrl = [];
    this.selectedRelation = [];
    if (this.preSelectedRel) {
      var element = document.getElementById(this.preSelectedRel);
      element.classList.remove("selected");
    }
    this.eventClicked.emit('reset');
  }


  relationclickEvent(selectedRelation) {
    if (this.preSelectedRel) {
      var element = document.getElementById(this.preSelectedRel);
      element.classList.remove("selected");
    }
    var element = document.getElementById(selectedRelation);
    element.classList.add("selected");
    this.selectedRelationship = [];
    this.relstatus = !this.relstatus;
    this.selectedRelationship.push({ type: selectedRelation });
    let requestBody = { nodes: [], edges: this.selectedRelationship };
    console.log("re", requestBody);
    this.sharedGraphData.setGraphData(requestBody);
    if (this.count === 1) {
      this.eventClicked.emit('search' + this.count);
      this.count = 2;
    } else {
      this.eventClicked.emit('search' + this.count);
      this.count = 1;
    }
    this.preSelectedRel = selectedRelation;
  }

  // return all nodes with selected relation
  relationSearchGraph() {
    let requestBody;
     if (this.selectedRelation.length > 0) {
      this.selectedRelationship = [];
      this.selectedRelation.map(rel=>{
        this.selectedRelationship.push({ type: rel });
      })
      // let temNodes = [];
      // if(this.selectedName.length > 0 || this.selectedType.length > 0){
      //   let temnode = [];
      //    temnode = this.selectedNodeCheck();
      //   temnode.filter(node=>{
      //     temNodes.push(node);      
      //   })       
      // }
      // 
      //   if(temNodes.length > 0){
      //      requestBody= { nodes: temNodes, edges: this.selectedRelationship };
      //   }else{
           requestBody= { nodes: [], edges: this.selectedRelationship };
        // }
      } else{
        // if no selected element 
        requestBody = { };
      }
      this.sharedGraphData.setGraphData(requestBody);
      if (this.count === 1) {
        this.eventClicked.emit('search' + this.count);
        this.count = 2;
      } else {
        this.eventClicked.emit('search' + this.count);
        this.count = 1;
      }

    
  }

  // this return selected name and type
  private selectedNodeCheck() {
      if(this.selectedName.length > 0 && this.selectedType.length > 0){
        let temNodeArray = [];
        temNodeArray.push({ type: "Name", value: this.selectedName });
        temNodeArray.push({ type: "Type", value: this.selectedType});
        return temNodeArray;
      }else if(this.selectedType.length > 0){
          return [{ type: "Type", value: this.selectedType }];
      }else if(this.selectedName.length > 0){
        return [{ type: "Name", value: this.selectedName }];
      }
  }
  noderelationSearchGraph() {
    if (this.selectedName.length > 0 || this.selectedType.length > 0 || this.selectedConnection.length > 0 || this.selectedRepresent.length > 0 || this.selectedStatus.length > 0 || this.selectedUnderstanding.length > 0 && this.selectedRelation.length > 0) {
      this.selectedRelationship = [];
      this.selectedRelation.map(rel=>{
        this.selectedRelationship.push({ type: rel });
      })
    }
    this.selectedGraph = [];
      this.selectedGraph.push({ type: "Name", value: this.selectedName });
      this.selectedGraph.push({ type: "Type", value: this.selectedType });
      this.selectedGraph.push({ type: "Connection", value: this.selectedConnection });
      this.selectedGraph.push({ type: "Represent", value: this.selectedRepresent });
      this.selectedGraph.push({ type: "Status", value: this.selectedStatus });
      this.selectedGraph.push({ type: "Thinking", value: this.selectedUnderstanding });
      this.selectedGraph.push({ type: "Url", value: this.selectedUrl });
      let requestBody = { nodes: this.selectedGraph, edges: this.selectedRelationship };

      this.sharedGraphData.setGraphData(requestBody);
      if (this.count === 1) {
        this.eventClicked.emit('search' + this.count);
        this.count = 2;
      } else {
        this.eventClicked.emit('search' + this.count);
        this.count = 1;
      }

  }


  networkElementClick(element) {}


  //
  NodeLimitToggleHandler(event) {
    try {
      if (event.constructor === Object) {
        this.showDisabled = event['isOn'];
      }
    } catch (e) {
      this.showDisabled = false;
    }
    this.sharedGraphData.sendToogleStatus(this.showDisabled);
    }


  extractLabels(data) {
    this.nodeTypes2 = [];
    data.forEach(label => {
      this.nodeTypes2.push(label.type[0]);
    });
    // console.log('types are ', this.nodeTypes2);
  }


  getNodeTypes() {
    return  this.searchService.runQuery(this.queryObj).pipe(map(data => {
      console.log('recieved label data from service ', data);
      this.processedData = this.processData(data);
      // extract types from the array
      this.extractLabels(this.processedData);
      // this.typeOptions = _.cloneDeep(this.nodeTypes2);
      return this.nodeTypes2;
    }));
  }
  processData(data) {
    if (data.length > 0) {
      let tempData = [];
      data.forEach(label => {
        tempData.push({ type: label._fields[1], properties: label._fields[0] });
      });
      return tempData;
    } else return [];
  }

  getRelationTypes() {
    return this.graphDataService.getGraphRelations().pipe(map(response => {

      this.relationsData = this.filterRelationsData(response);
      let extractedTypes = this.extractTypes(this.relationsData);
      // pass it into the options for dropdown
      this.relationTypeOptions = _.cloneDeep(extractedTypes);
      this.sharedGraphData.setRelationTypeOptions(this.relationTypeOptions);
      this.sharedGraphData.setRelationsData(this.relationsData);
      return true;
    }, err => {
      console.error('An error occured while fetching relations ', err);
      throw Error();
    }));
  }

  filterRelationsData(response) {
    let filteredObjectArray = [];
    filteredObjectArray.push(response[0]);
    response.splice(0, 1);
    // clear relations response as there are duplicates inside
    // steps to clear, process each relation type
    // find all the keys which are of this type and collect its properties into a unique array of objects
    let i = 0;
    while (i <= response.length) {
      if (response.length === 0) {
        i = 1;
      } else {
        let matched = false;
        filteredObjectArray.forEach(firstObj => {
          if (firstObj.type === response[i].type) {
            matched = true;
            firstObj['properties'].push(...response[i].properties);
          }
        });
        if (matched) {
          response.splice(i, 1);
          i = 0;
        } else {
          filteredObjectArray.push(response[i]);
          response.splice(i, 1);
        }
      }
    }
    // make the properties of each type as unique
    filteredObjectArray.map(typeObj => {
      typeObj['properties'] = _.uniq(typeObj['properties']);
      return typeObj;
    });
    console.log('final fetched types for relation is ', filteredObjectArray);
    return filteredObjectArray;
  }

  extractTypes(ObjectArray: any): any {
    let typesArray = [];
    ObjectArray.forEach(obj => {
      typesArray.push(obj['type']);
    });
    return typesArray;
  }

}
